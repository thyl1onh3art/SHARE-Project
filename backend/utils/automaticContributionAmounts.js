const { calendarDaysRemaining, deadlineStateFromDays } = require('./automaticContributionDates');

function toPence(value) {
  return Math.round((Number(value) || 0) * 100);
}

function fromPence(pence) {
  return Math.round(pence) / 100;
}

function plannedPersonalShare(targetAmount, plannedContributors) {
  if (!(Number(targetAmount) > 0) || !(Number(plannedContributors) > 0)) {
    return null;
  }
  return Math.round((Number(targetAmount) / Number(plannedContributors)) * 100) / 100;
}

function remainingPersonalAmount(plannedShare, contributed) {
  if (plannedShare === null || plannedShare === undefined) return 0;
  return Math.max(0, Math.round((plannedShare - Math.max(0, Number(contributed) || 0)) * 100) / 100);
}

function participantCount(account) {
  const ids = new Set();
  const add = (value) => {
    if (!value) return;
    const id = String(value._id || value);
    if (id && id !== 'undefined') ids.add(id);
  };
  add(account && account.owner);
  (account && account.members ? account.members : []).forEach(add);
  return Math.max(1, ids.size);
}

function plannedContributorCount(account) {
  const stored = Number(account && account.plannedContributors);
  if (Number.isInteger(stored) && stored >= 1) return stored;
  return participantCount(account || {});
}

function recurringAmountForFrequency(remaining, daysRemaining, frequency, deadlineState) {
  if (!(remaining > 0) || deadlineState !== 'future' || daysRemaining == null || daysRemaining <= 0) {
    return null;
  }
  const remainingPence = toPence(remaining);
  const daySpan = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : 30;
  const periods = Math.max(1, Math.ceil(daysRemaining / daySpan));
  return Math.ceil(remainingPence / periods) / 100;
}

/**
 * Amount to record for one due automatic contribution.
 * Prefer the persisted agreed instalment. Do not recast it just because
 * processing happens on a later calendar date.
 * scheduledAmount = min(persisted or legacy suggested, remainingPersonal, overallRemaining)
 */
function computeAgreedScheduledAmount({ remaining, deadline, now, frequency }) {
  const remainingSafe = Math.max(0, Number(remaining) || 0);
  const days = calendarDaysRemaining(deadline, now);
  const deadlineState = deadlineStateFromDays(days);
  const amount = recurringAmountForFrequency(remainingSafe, days, frequency, deadlineState);
  if (amount == null || !(amount > 0)) {
    return remainingSafe > 0 ? fromPence(toPence(remainingSafe)) : null;
  }
  return fromPence(toPence(amount));
}

function scheduledAutomaticAmount({
  targetAmount,
  plannedContributors,
  userContributed,
  totalContributed,
  deadline,
  now,
  frequency,
  scheduledAmount
}) {
  const plannedShare = plannedPersonalShare(targetAmount, plannedContributors);
  const remainingPersonal = remainingPersonalAmount(plannedShare, userContributed);
  const overallRemaining = Math.max(
    0,
    Math.round((Math.max(0, Number(targetAmount) || 0) - Math.max(0, Number(totalContributed) || 0)) * 100) / 100
  );
  const persisted = Number(scheduledAmount);
  let suggested = Number.isFinite(persisted) && persisted > 0 ? fromPence(toPence(persisted)) : null;
  if (suggested == null) {
    const days = calendarDaysRemaining(deadline, now);
    const deadlineState = deadlineStateFromDays(days);
    suggested = recurringAmountForFrequency(remainingPersonal, days, frequency, deadlineState);
    if (suggested == null || suggested <= 0) {
      suggested = remainingPersonal;
    }
  }
  const scheduled = Math.min(suggested, remainingPersonal, overallRemaining);
  return Math.max(0, fromPence(toPence(scheduled)));
}

function userInputTotal(records, userId) {
  const id = String(userId);
  return (records || []).reduce((sum, record) => {
    if (!record || record.type !== 'input') return sum;
    const recordUser = record.user && (record.user._id || record.user);
    if (String(recordUser) !== id) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);
}

module.exports = {
  toPence,
  plannedPersonalShare,
  remainingPersonalAmount,
  participantCount,
  plannedContributorCount,
  recurringAmountForFrequency,
  computeAgreedScheduledAmount,
  scheduledAutomaticAmount,
  userInputTotal
};
