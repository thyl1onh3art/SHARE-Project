const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['input', 'output'], required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  description: { type: String },
  sharedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAccount' },
  archivedAccountName: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FinanceRecord', financeRecordSchema);
