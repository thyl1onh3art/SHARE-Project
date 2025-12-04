const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  sharedAccount: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SharedAccount', 
    required: true 
  },
  requestedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0.01
  },
  description: { 
    type: String, 
    default: 'Full payment from shared account'
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'executed', 'cancelled'],
    default: 'pending'
  },
  approvals: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['approved', 'rejected'], required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  rejections: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  requiredApprovals: { 
    type: Number, 
    default: 0 // Will be calculated based on participant count
  },
  expiresAt: { 
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, { timestamps: true });

// Index for efficient queries
paymentRequestSchema.index({ sharedAccount: 1, status: 1 });
paymentRequestSchema.index({ requestedBy: 1, status: 1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);

