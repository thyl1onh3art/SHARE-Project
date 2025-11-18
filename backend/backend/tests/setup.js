// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/share_project_test';

// Suppress console.log during tests (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test timeout
jest.setTimeout(10000);

// Mock nodemailer and twilio for tests
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((options, callback) => {
      if (callback) callback(null, { response: 'test-email-id' });
      return Promise.resolve({ response: 'test-email-id' });
    })
  }))
}));

jest.mock('twilio', () => {
  return jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({ sid: 'test-sms-id' }))
    }
  }));
});
