const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired documents
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for email lookups
emailVerificationSchema.index({ email: 1 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
