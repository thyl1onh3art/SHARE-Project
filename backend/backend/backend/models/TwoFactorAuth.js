const mongoose = require('mongoose');

const twoFactorAuthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  emailEnabled: {
    type: Boolean,
    default: false
  },
  phoneEnabled: {
    type: Boolean,
    default: false
  },
  phoneNumber: {
    type: String,
    sparse: true // Allows multiple null values
  },
  emailSecret: {
    type: String,
    sparse: true
  },
  phoneSecret: {
    type: String,
    sparse: true
  },
  backupCodes: [{
    code: String,
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
twoFactorAuthSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);
