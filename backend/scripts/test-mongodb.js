const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { User, Event, FinanceRecord, SharedAccount } = require('./models/mongoose');

async function testMongoDBConnection() {
  try {
    console.log('🔗 Testing MongoDB connection...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/share-project-test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Test User model
    console.log('\n🧪 Testing User model...');
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User'
    });

    await testUser.save();
    console.log('✅ User created successfully');

    // Test finding user
    const foundUser = await User.findOne({ email: 'test@example.com' });
    console.log('✅ User found:', foundUser.username);

    // Test password comparison
    const isValidPassword = await foundUser.comparePassword('TestPassword123');
    console.log('✅ Password validation:', isValidPassword);

    // Clean up test data
    await User.deleteOne({ email: 'test@example.com' });
    console.log('✅ Test user cleaned up');

    // Test Event model
    console.log('\n🧪 Testing Event model...');
    const testEvent = new Event({
      user: foundUser._id,
      title: 'Test Event',
      description: 'A test event',
      eventDate: '2024-12-31',
      eventTime: '18:00',
      category: 'social'
    });

    await testEvent.save();
    console.log('✅ Event created successfully');

    // Clean up
    await Event.deleteOne({ title: 'Test Event' });
    console.log('✅ Test event cleaned up');

    console.log('\n🎉 All MongoDB tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testMongoDBConnection();
}

module.exports = testMongoDBConnection;
