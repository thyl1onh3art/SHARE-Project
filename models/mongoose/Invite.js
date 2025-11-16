const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedAccount',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  }
}, {
  timestamps: true
});

// Index for better performance
inviteSchema.index({ email: 1 });
inviteSchema.index({ token: 1 });
inviteSchema.index({ expiresAt: 1 });

// Pre-save middleware to check expiration
inviteSchema.pre('save', function(next) {
  if (this.expiresAt && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

const Invite = mongoose.model('Invite', inviteSchema);

module.exports = Invite;
