import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import animeRoutes from './routes/animeRoutes.js';
import { checkVersion } from './middleware/versionCheck.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Ensure DB connection per request
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Base API Health Check Route (Bypasses Version Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Version Check Middleware for API Endpoints
app.use('/api', checkVersion);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/anime', animeRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Server running on port ${PORT}`);
  });
}

export default app;
