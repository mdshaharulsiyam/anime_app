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

// Global crash prevention for unhandled async rejections and exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Root / Welcome Route (No DB check required)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Jikan Anime App Backend API is running',
  });
});

// Base API Health Check Route (No DB / No Version check required)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Version Check Middleware for API Endpoints
app.use('/api', checkVersion);

// Database Connection Middleware for API routes
app.use('/api', async (req, res, next) => {
  try {
    const conn = await connectDB();
    if (!conn) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is temporarily unavailable. Please try again shortly.',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/anime', animeRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`[Server] Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server Warning] Port ${PORT} is already in use. Local instance is already running.`);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

export default app;
