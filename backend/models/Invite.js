const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmail: { type: String, required: true },
  recipientPhone: { type: String }, // optional, for phone-based invites
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  readAt: { type: Date, default: null },
  sharedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAccount', required: true },
  expiresAt: { type: Date, default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 },
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);
