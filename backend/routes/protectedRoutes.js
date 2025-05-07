// backend/routes/protectedRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/dashboard", authMiddleware, (req, res) => {
  res.status(200).json({ message: `Welcome to the dashboard, user ID: ${req.user.id}` });
});

export default router;
