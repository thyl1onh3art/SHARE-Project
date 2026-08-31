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
    agreedAt: { type: Date },
    /**
     * Prototype automatic plan state. Historical Task 14 plans omit this;
     * agreed plans without status are treated as active.
     */
    status: { type: String, enum: ['active', 'paused', 'cancelled', 'completed'] },
    /** Calendar date YYYY-MM-DD — not a UTC instant. */
    nextContributionDate: { type: String },
    /**
     * Agreed recurring instalment. Optional on historical Task 14/15 plans.
     * Processing must not recast this just because the due date is later.
     */
    scheduledAmount: { type: Number, min: 0 },
    lastProcessedAt: { type: Date },
    pausedAt: { type: Date },
    cancelledAt: { type: Date }
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
