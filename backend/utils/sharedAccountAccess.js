const FinanceRecord = require('../models/FinanceRecord');

const resolveUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

/** Current Trip Money participant: owner or current member (mutations require this). */
const isAccountParticipant = (account, userId) => {
  if (!account || !userId) return false;
  const userIdStr = userId.toString();
  const ownerId = resolveUserId(account.owner);
  if (ownerId === userIdStr) return true;
  return (account.members || []).some((member) => resolveUserId(member) === userIdStr);
};

/**
 * Historical ledger activity for this user on this SharedAccount only.
 * Must match requesting user + requested account in the database (never trust client claims).
 */
const hasHistoricalFinanceActivity = async (account, userId) => {
  if (!account || !userId || !account._id) return false;

  const hasFinanceActivity = await FinanceRecord.exists({
    sharedAccount: account._id,
    user: userId
  });

  return !!hasFinanceActivity;
};

/** Read access: current participant OR former participant with own FinanceRecord on this pot. */
const canReadSharedAccount = async (account, userId) => {
  if (!account || !userId) return false;
  if (isAccountParticipant(account, userId)) return true;
  return hasHistoricalFinanceActivity(account, userId);
};

/** Write/mutate access: current owner or member only. Historical activity never grants this. */
const canMutateSharedAccount = (account, userId) => isAccountParticipant(account, userId);

module.exports = {
  resolveUserId,
  isAccountParticipant,
  hasHistoricalFinanceActivity,
  canReadSharedAccount,
  canMutateSharedAccount
};
