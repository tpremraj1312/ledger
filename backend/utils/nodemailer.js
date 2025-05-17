// testEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(process.env);
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "Not set");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Set" : "Not set");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail(
  {
    to: "tpujitha08@gmail.com",
    subject: "Test Email",
    text: "This is a test email.",
  },
  (err, info) => {
    if (err) {
      console.error("Error:", err);
    } else {
      console.log("Email sent:", info);
    }
  }
);