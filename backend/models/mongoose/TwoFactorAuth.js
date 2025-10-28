const mongoose = require('mongoose');

const twoFactorAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  qrCodeUrl: {
    type: String,
    required: true
  },
  backupCodes: [{
    type: String
  }],
  isEnabled: {
    type: Boolean,
    default: false
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const TwoFactorAuth = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);

module.exports = TwoFactorAuth;
