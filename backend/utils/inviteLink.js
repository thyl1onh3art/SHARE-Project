const crypto = require('crypto');
const { frontendOrigin } = require('./passwordReset');

const INVITE_TOKEN_BYTES = 32;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateInviteToken() {
  return crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
}

function hashInviteToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function isInviteTokenFormatValid(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

function inviteExpiryFrom(now = new Date()) {
  return new Date(now.getTime() + INVITE_EXPIRY_MS);
}

function buildInviteUrl(rawToken, origin = frontendOrigin()) {
  return `${String(origin).replace(/\/$/, '')}/invite/${rawToken}`;
}

function organiserDisplayName(person) {
  if (!person || typeof person !== 'object') return 'A member';
  const named = String(person.name || '').trim();
  if (named) return named;
  const full = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  if (full) return full;
  return 'A member';
}

module.exports = {
  INVITE_TOKEN_BYTES,
  INVITE_EXPIRY_MS,
  generateInviteToken,
  hashInviteToken,
  isInviteTokenFormatValid,
  inviteExpiryFrom,
  buildInviteUrl,
  organiserDisplayName
};
