import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import stasesRoutes from './routes/stases.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import paymentsRoutes from './routes/payments.js';
import tokenPackagesRoutes from './routes/tokenPackages.js';
import videosRoutes from './routes/videos.js';
import materialsRoutes from './routes/materials.js';
import commentsRoutes from './routes/comments.js';
import mentorsRoutes from './routes/mentors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'MedSkill API is running',
    timestamp: new Date().toISOString()
  });
});

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MedSkill API v1',
    endpoints: {
      auth: '/api/auth',
      stases: '/api/stases',
      subscriptions: '/api/subscriptions',
      payments: '/api/payments',
      'token-packages': '/api/token-packages',
      videos: '/api/videos',
      materials: '/api/materials',
      comments: '/api/comments',
      mentors: '/api/mentors'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stases', stasesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/token-packages', tokenPackagesRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/mentors', mentorsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║     🏥 MedSkill Backend API Server           ║
║     🚀 Server running on port ${PORT}           ║
║     🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║     📦 API: http://localhost:${PORT}/api        ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
