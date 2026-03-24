import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/authRateLimiter.js";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Email transporter setup
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Set" : "Not set");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Set" : "Not set");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("Email credentials are missing. Please set EMAIL_USER and EMAIL_PASS in .env file.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Transporter verification failed:", error);
  } else {
    console.log("Transporter is ready to send emails");
  }
});

// Debug Google OAuth credentials
console.log("Initializing Google OAuth Strategy...");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set");

// Passport Google Strategy Configuration
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("Google OAuth credentials are missing. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file.");
} else {
  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth Callback - Profile:", profile);
            let user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              console.log("Existing user found:", user.email);
              return done(null, user);
            }

            user = new User({
              username: profile.displayName || `user${profile.id}`,
              email: profile.emails[0].value,
              password: await bcrypt.hash(profile.id + Date.now(), 10),
            });
            await user.save();
            console.log("New user created:", user.email);
            return done(null, user);
          } catch (err) {
            console.error("Google OAuth callback error:", err);
            return done(err, null);
          }
        }
      )
    );
    console.log("Google OAuth Strategy registered successfully.");
  } catch (err) {
    console.error("Failed to register Google OAuth Strategy:", err);
  }
}

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user._id);
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log("Deserializing user:", user ? user._id : "Not found");
    done(null, user);
  } catch (err) {
    console.error("Deserialize user error:", err);
    done(err, null);
  }
});

// Google OAuth Routes
router.get(
  "/google",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Google OAuth route accessed but credentials are missing.");
      return res.status(500).json({ message: "Google OAuth is not configured properly" });
    }
    console.log("Accessing Google OAuth route...");
    const authOptions = { scope: ["profile", "email"], session: false };
    if (req.query.redirectUri) {
      authOptions.state = Buffer.from(JSON.stringify({ redirectUri: req.query.redirectUri })).toString("base64");
    }
    passport.authenticate("google", authOptions)(req, res, next);
  }
);

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` })(req, res, next);
  },
  (req, res) => {
    console.log("Google OAuth callback successful, user:", req.user.email);
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    let redirectUrl = `${process.env.FRONTEND_URL}/login`;
    if (req.query.state) {
      try {
        const stateObj = JSON.parse(Buffer.from(req.query.state, 'base64').toString('utf8'));
        if (stateObj.redirectUri) {
          redirectUrl = stateObj.redirectUri;
        }
      } catch (e) {
        console.error("Failed to parse state param:", e);
      }
    }
    
    const separator = redirectUrl.includes("?") ? "&" : "?";
    res.redirect(`${redirectUrl}${separator}token=${token}&userId=${req.user._id}&username=${encodeURIComponent(req.user.username)}&email=${encodeURIComponent(req.user.email)}`);
  }
);

// --- Forgot Password Route ---
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("Cannot send password reset email: Email credentials are missing.");
      return res.status(500).json({ message: "Email service is not configured properly" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpires = Date.now() + 3600000;

    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken: resetTokenHash, resetTokenExpires } }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    console.log("Sending password reset email to:", email);
    console.log("Reset URL:", resetUrl);

    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>This link expires in 1 hour.</p>
      `,
    });

    res.status(200).json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to process request", error: err.message });
  }
});

// --- Reset Password Route ---
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Email, token, and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findOne({ email, resetTokenExpires: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const isTokenValid = await bcrypt.compare(token, user.resetToken);
    if (!isTokenValid) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { resetToken: "", resetTokenExpires: "" } }
    );

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
});

// --- Signup Route ---
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Please use a valid email address" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({
      message: "Signup successful. Please log in.",
      user: { userId: newUser._id, username: newUser.username, email: newUser.email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation failed', errors: messages });
    }
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// --- Login Route ---
router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await existingUser.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: existingUser._id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // Short expiry
    );

    const refreshToken = jwt.sign(
      { userId: existingUser._id },
      process.env.JWT_SECRET + "_refresh", // In production should have distinct env var
      { expiresIn: "7d" }
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      token,
      user: {
        userId: existingUser._id,
        username: existingUser.username,
        email: existingUser.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// --- Get Current User Details ---
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      currentFamilyId: user.currentFamilyId || null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ message: "Error fetching user details" });
  }
});

// --- Change Password Route ---
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long" });
  }

  try {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
});

export default router;