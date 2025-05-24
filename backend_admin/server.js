import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

import adminAuthRoutes from './routes/adminAuthRoutes.js';
// import adminUserRoutes from './routes/adminUserRoutes.js';
dotenv.config();
const app = express();
app.use(cors({
  origin: process.env.ADMIN_FRONTEND || "http://localhost:5173" , // allow frontend origin
  credentials: true, // optional: if you're using cookies or auth headers
}));

app.use(express.json());

// Admin auth route
app.use('/admin', adminAuthRoutes);

// Server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Admin backend running on port ${PORT}`));
  })
  .catch((err) => console.error('Mongo error:', err));
