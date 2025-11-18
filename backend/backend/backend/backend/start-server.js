// Set environment variables
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';
process.env.MONGO_URI = 'mongodb://localhost:27017/share_project';
process.env.JWT_SECRET = 'your_super_secret_jwt_key_here_make_it_long_and_random_12345';
process.env.JWT_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Load the main app
require('./app.js');
