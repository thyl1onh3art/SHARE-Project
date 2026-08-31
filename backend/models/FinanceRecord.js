const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['input', 'output'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  sharedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAccount' },
  /** Readable Trip Money pot name after permanent deletion (sharedAccount unset). */
  archivedAccountName: { type: String },
  /**
   * Prototype contribution source. Omitted/manual = member-recorded.
   * automatic = simulated scheduled contribution. Not a Direct Debit.
   */
  source: { type: String, enum: ['manual', 'automatic'] },
  contributionPlanId: { type: mongoose.Schema.Types.ObjectId },
  /** Calendar date YYYY-MM-DD this automatic contribution was scheduled for. */
  scheduledFor: { type: String },
  /** Durable idempotency key: sharedAccountId:userId:scheduledFor */
  processorKey: { type: String }
}, { timestamps: true });

financeRecordSchema.index({ processorKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('FinanceRecord', financeRecordSchema);
