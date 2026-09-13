const crypto = require('crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000;
const GENERIC_REQUEST_MESSAGE =
  'If an account exists for that email address, password reset instructions have been sent.';
const GENERIC_INVALID_MESSAGE = 'This password reset link is invalid or has expired.';

function generateResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function resetExpiryFrom(now = new Date()) {
  return new Date(now.getTime() + RESET_EXPIRY_MS);
}

function applyResetToken(user, rawToken, now = new Date()) {
  user.passwordResetTokenHash = hashResetToken(rawToken);
  user.passwordResetExpiresAt = resetExpiryFrom(now);
  return user;
}

function clearResetToken(user) {
  delete user.passwordResetTokenHash;
  delete user.passwordResetExpiresAt;
  return user;
}

function resetTokenLookupQuery(rawToken, now = new Date()) {
  return {
    passwordResetTokenHash: hashResetToken(rawToken),
    passwordResetExpiresAt: { $gt: now }
  };
}

/** Atomic password replace + durable token consume. Mongoose ignores `undefined` on save(). */
function consumeResetTokenUpdate(hashedPassword) {
  return {
    $set: { password: hashedPassword },
    $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 }
  };
}

function isResetTokenFormatValid(token) {
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
}

function frontendOrigin() {
  const fromFrontend = process.env.FRONTEND_URL;
  if (fromFrontend) {
    return String(fromFrontend).split(',')[0].trim().replace(/\/$/, '');
  }
  const fromCors = process.env.CORS_ORIGIN;
  if (fromCors) {
    return String(fromCors).split(',')[0].trim().replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}

function buildResetUrl(rawToken, origin = frontendOrigin()) {
  return `${String(origin).replace(/\/$/, '')}/reset-password/${rawToken}`;
}

function shouldExposeDevelopmentResetUrl() {
  return process.env.NODE_ENV !== 'production';
}

function forgotPasswordResponse(developmentResetUrl) {
  const body = { message: GENERIC_REQUEST_MESSAGE };
  if (shouldExposeDevelopmentResetUrl() && developmentResetUrl) {
    body.developmentResetUrl = developmentResetUrl;
  }
  return body;
}

module.exports = {
  RESET_TOKEN_BYTES,
  RESET_EXPIRY_MS,
  GENERIC_REQUEST_MESSAGE,
  GENERIC_INVALID_MESSAGE,
  generateResetToken,
  hashResetToken,
  resetExpiryFrom,
  applyResetToken,
  clearResetToken,
  resetTokenLookupQuery,
  consumeResetTokenUpdate,
  isResetTokenFormatValid,
  frontendOrigin,
  buildResetUrl,
  shouldExposeDevelopmentResetUrl,
  forgotPasswordResponse
};
