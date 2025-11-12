const mongoose = require('mongoose');

const sharedAccountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  financeRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FinanceRecord' }],
}, { timestamps: true });

module.exports = mongoose.model('SharedAccount', sharedAccountSchema);
