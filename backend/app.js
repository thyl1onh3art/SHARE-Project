const express = require('express');
const https = require('https');
const fs = require('fs');
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
const mongodbService = require('./services/mongodb');

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
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001'
  ],
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
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await mongodbService.healthCheck();
    
    res.status(200).json({
      status: 'OK',
      message: 'SHARE Project API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.6', // FORCE REBUILD - MongoDB connection fix
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Root endpoint (for Vercel dashboard)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'SHARE Project API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.6',
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

// Data store initialization
const initializeDataStore = async () => {
  try {
    console.log('🔗 Initializing MongoDB connection...');
    console.log('🔍 DEBUG: Environment variables:');
    console.log('🔍 MONGO_PUBLIC_URL:', process.env.MONGO_PUBLIC_URL);
    console.log('🔍 MONGO_URL:', process.env.MONGO_URL);
    console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI);
    await mongodbService.connect();
    const healthCheck = await mongodbService.healthCheck();
    console.log('📊 MongoDB health check:', healthCheck);
    console.log('✅ MongoDB initialized successfully');
  } catch (error) {
    console.error('❌ MongoDB initialization error:', error.message);
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
    await initializeDataStore();
    
    // Only start HTTP server if not in Vercel environment
    if (!process.env.VERCEL) {
      // Start HTTP server
      app.listen(PORT, () => {
        console.log(`🚀 SHARE Project API server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`💾 Database: MongoDB with Mongoose ODM`);
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
  await mongodbService.disconnect();
  console.log('🔌 MongoDB disconnected');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await mongodbService.disconnect();
  console.log('🔌 MongoDB disconnected');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;