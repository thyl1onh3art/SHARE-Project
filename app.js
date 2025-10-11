const express = require('express');
const https = require('https');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config({ path: './.env' });

// Import routes
const userRoutes = require('./routes/userRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const sharedAccountRoutes = require('./routes/sharedAccountRoutes');
const financeRoutes = require('./routes/financeRoutes');
const eventRoutes = require('./routes/eventRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
// const emailVerificationRoutes = require('./routes/emailVerificationRoutes');
const twoFactorRoutes = require('./routes/twoFactorRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { 
  wafMiddleware, 
  globalRateLimit, 
  loginRateLimit, 
  registrationRateLimit, 
  twoFactorRateLimit,
  speedLimiter,
  securityHeaders 
} = require('./middleware/waf');

// Import services
const backupService = require('./services/backupService');

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// Web Application Firewall
app.use(wafMiddleware);

// Global rate limiting
app.use(globalRateLimit);

// Speed limiter for failed attempts
app.use(speedLimiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SHARE Project API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.3' // Updated for User model fix deployment
  });
});

// Root endpoint (for Vercel dashboard)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SHARE Project API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.3',
    endpoints: {
      health: '/health',
      users: '/api/users',
      sharedAccounts: '/api/shared-accounts',
      events: '/api/events',
      gallery: '/api/gallery'
    }
  });
});

// API routes with specific rate limiting
app.use('/api/users/login', loginRateLimit, userRoutes);
app.use('/api/users/register', registrationRateLimit, userRoutes);
app.use('/api/users', userRoutes);

app.use('/api/two-factor/send-code', twoFactorRateLimit, twoFactorRoutes);
app.use('/api/two-factor/verify-code', twoFactorRateLimit, twoFactorRoutes);
app.use('/api/two-factor', twoFactorRoutes);

app.use('/api/backup', backupRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/shared-accounts', sharedAccountRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gallery', galleryRoutes);
// app.use('/api/email-verification', emailVerificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/share_project';
    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Don't exit in serverless environment - let Vercel handle it
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;

const startServer = async () => {
  try {
    await connectDB();
    
    // Only start HTTP server if not in Vercel environment
    if (!process.env.VERCEL) {
      // Start HTTP server
      app.listen(PORT, () => {
        console.log(`🚀 SHARE Project API server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
      });

      // Start HTTPS server
      try {
        const httpsOptions = {
          key: fs.readFileSync('./key.pem'),
          cert: fs.readFileSync('./cert.pem')
        };

        https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
          console.log(`🔒 HTTPS server running on port ${HTTPS_PORT}`);
          console.log(`🔐 Secure health check: https://localhost:${HTTPS_PORT}/health`);
        });
      } catch (sslError) {
        console.warn('⚠️ HTTPS server not started:', sslError.message);
        console.log('💡 Run "node generateCert.js" to generate SSL certificates');
      }
    } else {
      console.log('🚀 Running in Vercel serverless environment');
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    // Don't exit in serverless environment - let Vercel handle it
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  console.log('📦 MongoDB connection closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  console.log('📦 MongoDB connection closed');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;