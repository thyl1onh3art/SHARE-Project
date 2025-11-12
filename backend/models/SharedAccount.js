const mongoose = require('mongoose');

const sharedAccountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  financeRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FinanceRecord' }],
  // Group payment feature - tracks commitments (virtual), not actual money holding
  groupPayment: {
    targetAmount: { type: Number, default: 0 },
    totalCommitted: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'payment_created', 'completed', 'cancelled'],
      default: 'pending'
    },
    paymentId: { type: String },
    description: { type: String },
    contributions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      amount: { type: Number, required: true },
      description: { type: String },
      contributionId: { type: String },
      status: { type: String, default: 'committed' },
      committedAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    paymentCreatedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('SharedAccount', sharedAccountSchema);
