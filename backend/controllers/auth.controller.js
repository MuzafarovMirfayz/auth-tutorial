import  User from "../models/user.model.js";
import  bcrypt from 'bcryptjs'
import crypto from 'crypto';
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
	sendPasswordResetEmail,
	sendResetSuccessEmail,
	sendVerificationEmail,
	sendWelcomeEmail,
} from "../mailtrap/emails.js";
import redis from "../redis.js";
// User.sync({
//     force: true
// })
export const signup = async (req, res) => {
    const { email, password, name } = req.body;
    try{
        if(!email || !password || !name){
            throw new Error("-> " + password)
        }
        
        const userAlreadyExists = await User.findOne({
            where: {
                email: email
            }
        })

        

        if(userAlreadyExists){
            return res.status(400).json({success:false, message:"User already exists", data:{}})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()

        const userCreate =  User.build({
            email: email,
            password: hashedPassword,
            name: name,
            verificationToken: verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000
        })


        await redis.connect(); 
        await redis.set(`user:${verificationToken}`, JSON.stringify(userCreate.dataValues));
        await redis.quit(); 
        console.log(verificationToken)

        const token = generateTokenAndSetCookie(res, userCreate.dataValues._id);
        await sendVerificationEmail(userCreate.email, verificationToken);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                _id: userCreate._id,
                name: userCreate.name,
                email: userCreate.email,
                token: token
            }
        })
    }catch(error){
        res.status(400).json({success:false, message:error.message, data:{}})
    }

}


export const verifyEmail = async (req, res) => {
    const { code } = req.body;
    try {
        await redis.connect(); 
        const userData = await redis.get(`user:${code}`);
        await redis.del(`user:${code}`);
        await redis.quit(); 

        if (!userData) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        // Parse the user data from Redis
        const userParsed = JSON.parse(userData);

        // Create a new user instance from the parsed data and save it in PostgreSQL
        const user = await User.create({
            _id: userParsed._id,
            email: userParsed.email,
            password: userParsed.password,
            name: userParsed.name,
            verificationToken: null,
            verificationTokenExpiresAt: null,
            isVerified: true,
        });

        await sendWelcomeEmail(user.email, user.name);

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.error("Error in verifyEmail:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

export const logout = async (req, res) => {
	res.clearCookie("token");
	res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        }

        generateTokenAndSetCookie(res, user.id);  

        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                lastLogin: user.lastLogin,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.error("Error in login", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = resetTokenExpiresAt;

        await user.save();

        await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

        res.status(200).json({ success: true, message: "Password reset link sent to your email" });
    } catch (error) {
        console.error("Error in forgotPassword", error);
        res.status(400).json({ success: false, message: error.message });
    }
};



export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
            }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = null; 
        user.resetPasswordExpiresAt = null;
        await user.save();

        await sendResetSuccessEmail(user.email);

        res.status(200).json({ success: true, message: "Password reset successful" });
    } catch (error) {
        console.error("Error in resetPassword", error);
        res.status(400).json({ success: false, message: error.message });
    }
};


export const checkAuth = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            attributes: { exclude: ['password'] }  
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error in checkAuth", error);
        res.status(400).json({ success: false, message: error.message });
    }
};


