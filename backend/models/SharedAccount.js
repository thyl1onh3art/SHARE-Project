const mongoose = require('mongoose');

const sharedAccountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  description: { type: String },
  targetAmount: { type: Number },
  targetDate: { type: Date },
  /**
   * Total people expected to contribute, including the creator.
   * Optional on historical pots — frontend falls back to owner + accepted members.
   */
  plannedContributors: { type: Number, min: 1 },
  /**
   * Per-user prototype contribution schedules. Not a Shared Account-wide frequency.
   * Historical pots have an empty array — never treat that as an agreed plan.
   */
  contributionPlans: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    frequency: { type: String, enum: ['weekly', 'fortnightly', 'monthly'], required: true },
    agreed: { type: Boolean, default: false },
    agreedAt: { type: Date }
  }],
  perPersonAmount: { type: Number },
  financeRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FinanceRecord' }],
  /**
   * Optional Trip (Event) this pot belongs to.
   * Unset on recovered/legacy pots — they stay fully usable without a Trip link.
   */
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  /** Soft-archive: inactive Trip Money pot; history remains readable. */
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

sharedAccountSchema.index({ event: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('SharedAccount', sharedAccountSchema);
