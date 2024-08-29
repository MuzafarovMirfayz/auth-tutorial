import dotenv from "dotenv";
import nodemailer from "nodemailer"

dotenv.config();

export const sender = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});