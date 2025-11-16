const mongoose = require('mongoose');

const twoFactorCodeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    }
  }
}, {
  timestamps: true
});

// Index for cleanup
twoFactorCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TwoFactorCode = mongoose.model('TwoFactorCode', twoFactorCodeSchema);

module.exports = TwoFactorCode;
