const FinanceRecord = require('../models/FinanceRecord');

const resolveUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

/** Soft-archived Trip Money pot (inactive; historical read only). */
const isArchivedSharedAccount = (account) => Boolean(account && account.isDeleted);

/** Current Trip Money participant: owner or current member. */
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

/** Read access: current participant OR former participant with own FinanceRecord on this pot (including archived). */
const canReadSharedAccount = async (account, userId) => {
  if (!account || !userId) return false;
  if (isAccountParticipant(account, userId)) return true;
  return hasHistoricalFinanceActivity(account, userId);
};

/**
 * Write/mutate access for an active pot: current owner/member only.
 * Archived pots never grant mutate rights (historical read remains separate).
 */
const canMutateSharedAccount = (account, userId) => {
  if (!account || !userId) return false;
  if (isArchivedSharedAccount(account)) return false;
  return isAccountParticipant(account, userId);
};

module.exports = {
  resolveUserId,
  isArchivedSharedAccount,
  isAccountParticipant,
  hasHistoricalFinanceActivity,
  canReadSharedAccount,
  canMutateSharedAccount
};
