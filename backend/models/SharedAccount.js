const mongoose = require('mongoose');

const sharedAccountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  description: { type: String },
  targetAmount: { type: Number },
  targetDate: { type: Date },
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
