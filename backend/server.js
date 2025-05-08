import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";

// Import API routes
import transactionRoutes from "./routes/transactionRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import billScanRoutes from "./routes/billscanRoutes.js";
import InvestmentsRoutes from "./routes/investmentRoutes.js";
import aiAnalysisRoutes from "./routes/aiAnalysisRoutes.js";
import budgetComparisonRoutes from "./routes/budgetComparisionRoutes.js"
dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---

// Public Auth Routes
app.use("/api/auth", authRoutes);

// Protected Routes (Apply authMiddleware)
app.use("/api/transactions", authMiddleware, transactionRoutes);
app.use("/api/budgets", authMiddleware, budgetRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/billscan", authMiddleware, billScanRoutes);
app.use("/api/investments",authMiddleware,InvestmentsRoutes);
app.use('/api/ai-analysis',authMiddleware, aiAnalysisRoutes);
app.use('/api/budget-comparison',authMiddleware, budgetComparisonRoutes);
// Basic Root Route
app.get("/", (req, res) => {
    res.send("Dummy UPI App Backend Running!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err); // Log the full error
  let statusCode = 500;
  let message = 'Something went wrong on the server!';

  if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
  } else if (err.status) {
      statusCode = err.status;
      message = err.message;
  } else if (err.code === 11000) {
      statusCode = 409; // Conflict
      message = 'Duplicate value entered.';
      if (err.keyValue) {
          const keys = Object.keys(err.keyValue);
          message = `An entry with this ${keys.join(', ')} already exists.`;
      }
  }

  res.status(statusCode).json({ message: message, error: err.message });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Connection Failed:", err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'Configured' : 'Not configured - Check .env file!'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});