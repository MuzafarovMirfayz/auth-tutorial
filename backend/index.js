import express from "express";
import sequelize from "./sequelize.js";
import authRoute from "./routes/auth.route.js"
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors"
import path from "path"

dotenv.config();

const app = express();
const port = process.env.PORT || 5000

sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
  }).catch(err => {
    console.error('Unable to connect to the database:', err);
  });


app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", authRoute)

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}


app.listen(port, () => {
    console.log("Server is running on port: " + port)
})