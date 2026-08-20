const FinanceRecord = require('../models/FinanceRecord');

const resolveUserId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const isAccountParticipant = (account, userId) => {
  const userIdStr = userId.toString();
  const ownerId = resolveUserId(account.owner);
  if (ownerId === userIdStr) return true;
  return (account.members || []).some((member) => resolveUserId(member) === userIdStr);
};

const hasSharedAccountAccess = async (account, userId) => {
  if (!account || !userId) return false;
  if (isAccountParticipant(account, userId)) return true;

  const hasFinanceActivity = await FinanceRecord.exists({
    sharedAccount: account._id,
    user: userId
  });

  return !!hasFinanceActivity;
};

module.exports = {
  resolveUserId,
  isAccountParticipant,
  hasSharedAccountAccess
};
