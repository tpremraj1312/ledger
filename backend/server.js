import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Debug environment variables
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "Not set");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Set" : "Not set");

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("Critical: Google OAuth credentials are missing. Google OAuth routes will not work.");
}

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { configurePassport } from "./utils/passwordConfig.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import logger from "./utils/logger.js";

// Import API routes
import transactionRoutes from "./routes/transactionRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import billScanRoutes from "./routes/billscanRoutes.js";
import InvestmentsRoutes from "./routes/investmentRoutes.js";
import investmentTransactionRoutes from "./routes/investmentTransactionRoutes.js";
import aiPlannerRoutes from "./routes/aiPlannerRoutes.js";
import aiAnalysisRoutes from "./routes/aiAnalysisRoutes.js";
import budgetComparisonRoutes from "./routes/budgetComparisionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js"
import userRoutes from './routes/userRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import familyBudgetRoutes from './routes/familyBudgetRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import { processRecurringExpenses } from './utils/recurringCron.js';
import cron from 'node-cron';

// Configure Passport
configurePassport();

const app = express();

// 1. HTTP Security Headers
app.use(helmet());

// 2. Request Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// 3. Cookie Parser
app.use(cookieParser());

// 4. Rate Limiting (Global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.FRONTEND_URL_APP, 'http://localhost:8081', 'http://localhost:19006', 'https://ledger-x25s.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// 6. Data Sanitization against XSS
app.use(xss());
app.use(
  session({
    secret: process.env.JWT_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: 'lax'
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// --- API Routes ---

// Public Auth Routes
app.use("/api/auth", authRoutes);

// Protected Routes (Apply authMiddleware)
app.use("/api/transactions", authMiddleware, transactionRoutes);
app.use("/api/budgets", authMiddleware, budgetRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/billscan", authMiddleware, billScanRoutes);
app.use("/api/investments/ai", authMiddleware, aiPlannerRoutes);
app.use("/api/investments", authMiddleware, investmentTransactionRoutes);
app.use("/api/ai-analysis", authMiddleware, aiAnalysisRoutes);
app.use("/api/budget-comparison", authMiddleware, budgetComparisonRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/gamification', authMiddleware, gamificationRoutes);
app.use('/api/financial', authMiddleware, financialRoutes);
app.use('/api/recurring', authMiddleware, recurringRoutes);
app.use('/api/family', authMiddleware, familyRoutes);
app.use('/api/family-budget', authMiddleware, familyBudgetRoutes);
app.use('/api/tax', authMiddleware, taxRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/agent', authMiddleware, agentRoutes);
app.use('/api/sms', authMiddleware, smsRoutes);

// Basic Root Route
app.get("/", (req, res) => {
  res.send("Dummy UPI App Backend Running!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

  let statusCode = 500;
  let message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value entered.';
    if (err.keyValue) {
      const keys = Object.keys(err.keyValue);
      message = `An entry with this ${keys.join(', ')} already exists.`;
    }
  } else if (err.message && err.message.includes("Unknown authentication strategy")) {
    statusCode = 500;
    message = "Authentication strategy not configured properly";
  }

  res.status(statusCode).json({ message: message, error: process.env.NODE_ENV === 'production' ? null : err.message });
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

  // Initialize Recurring Expenses Cron (runs every day at midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily recurring expenses check...');
    await processRecurringExpenses();
  });

  // Initialize Gamification Cron Jobs
  async function startCron() {
    try {
      const { initCronJobs } = await import('./services/cronService.js');
      initCronJobs();
    } catch (err) {
      console.error('Failed to initialize gamification cron jobs:', err);
    }
  }

  startCron();

  // Also run on startup for immediate processing if missed
  processRecurringExpenses();
});