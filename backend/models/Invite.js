const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmail: { type: String, default: '' },
  recipientPhone: { type: String }, // optional, for phone-based invites
  inviteType: { type: String, enum: ['email', 'link'], default: 'email' },
  inviteTokenHash: { type: String, default: undefined, index: true, unique: true, sparse: true },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  /**
   * When the invited recipient last marked this invitation as read.
   * Safe for Invite because each document has one intended recipient.
   */
  readAt: { type: Date, default: null },
  sharedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAccount', required: true },
  expiresAt: { type: Date, default: () => Date.now() + 7 * 24 * 60 * 60 * 1000 },
}, { timestamps: true });

module.exports = mongoose.model('Invite', inviteSchema);
