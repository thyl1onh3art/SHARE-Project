const mongoose = require('mongoose');

class MongoDBService {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('MongoDB already connected');
        return this.connection;
      }

      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL || process.env.DATABASE_URL;

      if (!mongoUri) {
        throw new Error('MongoDB URI not found. Please set MONGO_URI, MONGODB_URI, or DATABASE_URL.');
      }

      console.log('Connecting to MongoDB...');
      
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;
      
      console.log('MongoDB connected successfully');
      console.log(`Database: ${this.connection.connection.db.databaseName}`);
      
      return this.connection;
    } catch (error) {
      console.error('MongoDB connection error:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected && this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        console.log('MongoDB disconnected');
      }
    } catch (error) {
      console.error('MongoDB disconnection error:', error.message);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Not connected to MongoDB' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'MongoDB connection is healthy',
        database: mongoose.connection.db.databaseName,
        collections: await mongoose.connection.db.listCollections().toArray()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `MongoDB health check failed: ${error.message}`
      };
    }
  }
}

// Create singleton instance
const mongodbService = new MongoDBService();

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongodbService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongodbService.disconnect();
  process.exit(0);
});

module.exports = mongodbService;
