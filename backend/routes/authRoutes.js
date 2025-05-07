// backend/routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js"; // User model (without bankDetails)
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Signup Route (Basic User Creation) ---
// Creates a user with only username, email, password hash.
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Basic Validation
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
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" }); // 409 Conflict
    }

    // --- User model's pre-save hook handles hashing ---
    const newUser = new User({ username, email, password }); // Pass plain password
    await newUser.save(); // Hashing happens here

    // --- Respond on successful creation ---
    // Option 1: Respond with success, user needs to login separately.
    res.status(201).json({
      message: "Signup successful. Please log in.",
      user: { userId: newUser._id, username: newUser.username, email: newUser.email },
    });

    // Option 2: Automatically log user in by sending token (as before)
    // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    // res.status(201).json({ token, user: { userId: newUser._id, username: newUser.username, email: newUser.email } });

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
// Validates credentials and returns a JWT token.
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email. Explicitly select password hash for comparison.
    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser) {
      // Use a generic message for security (don't reveal if email exists)
      return res.status(401).json({ message: "Invalid credentials" }); // 401 Unauthorized
    }

    // Use the comparePassword method from the User model
    const isPasswordCorrect = await existingUser.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" }); // 401 Unauthorized
    }

    // --- Generate JWT Token ---
    const token = jwt.sign(
        { userId: existingUser._id }, // Payload contains user ID
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Use a reasonable expiration time
    );

    // --- Respond with Token and basic user info ---
    res.status(200).json({
        token,
        user: {
            userId: existingUser._id,
            username: existingUser.username,
            email: existingUser.email
        }
     });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});


// --- Get Current User Details ---
// Fetches details for the currently authenticated user.
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // req.user is added by authMiddleware
    const user = await User.findById(req.user._id).select("-password"); // Exclude password hash
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ message: "Error fetching user details" });
  }
});

// --- Change Password Route ---
// Route: POST /api/auth/change-password
// Access: Private
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id; // Use req.user._id from authMiddleware

  // Basic validation
  if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
  }
   if (newPassword.length < 6) {
     return res.status(400).json({ message: "New password must be at least 6 characters long" });
   }
   // Optional: Prevent setting the same password
   // if (currentPassword === newPassword) {
   //     return res.status(400).json({ message: 'New password cannot be the same as the current password' });
   // }

  try {
      // 1. Find user and select password field
      const user = await User.findById(userId).select('+password');
      if (!user) {
          // Should not happen if middleware is working, but good practice
          return res.status(404).json({ message: 'User not found' });
      }

      // 2. Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
          return res.status(401).json({ message: 'Incorrect current password' });
      }

      // 3. Hash the new password directly
      // We hash manually because we use updateOne, which doesn't trigger the pre-save hook
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 4. Update the user's password in the database
      await User.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

      res.status(200).json({ message: 'Password changed successfully' });

  } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
});
// --- REMOVED: /register endpoint ---
// Account creation is now handled by POST /api/accounts after login.

// --- REMOVED: Placeholder /dashboard endpoint ---

export default router;