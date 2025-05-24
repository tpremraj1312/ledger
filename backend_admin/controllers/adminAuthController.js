import Admin from '../models/admin.js';
import jwt from 'jsonwebtoken';

export const registerAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const newAdmin = new Admin({ email, password });
    await newAdmin.save();

    res.status(201).json({ message: 'Admin account created successfully' });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
    console.log("Login route was hit");
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
