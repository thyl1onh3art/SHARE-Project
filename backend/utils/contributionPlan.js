const { calendarDateKey, firstDueDate } = require('./automaticContributionDates');
const {
  computeAgreedScheduledAmount,
  plannedPersonalShare,
  plannedContributorCount
} = require('./automaticContributionAmounts');

const CONTRIBUTION_FREQUENCIES = ['weekly', 'fortnightly', 'monthly'];
const CONTRIBUTION_PLAN_STATUSES = ['active', 'paused', 'cancelled', 'completed'];

function parseContributionFrequency(value) {
  if (value === undefined || value === null || value === '') {
    return { error: 'Choose how often you want to contribute' };
  }
  const raw = String(value).trim();
  if (!CONTRIBUTION_FREQUENCIES.includes(raw)) {
    return { error: 'Choose Weekly, Every 2 weeks, or Monthly' };
  }
  return { value: raw };
}

function parseContributionAgreement(value) {
  if (value === true || value === 'true') {
    return { value: true };
  }
  return { error: 'Please agree to this contribution plan' };
}

function planStatus(plan) {
  if (!plan) return null;
  if (CONTRIBUTION_PLAN_STATUSES.includes(plan.status)) return plan.status;
  return plan.agreed ? 'active' : null;
}

function assignScheduledAmount(plan, frequency, at, scheduleContext = {}) {
  const remaining = scheduleContext.remaining != null
    ? scheduleContext.remaining
    : plannedPersonalShare(scheduleContext.targetAmount, scheduleContext.plannedContributors);
  const deadline = scheduleContext.deadline || scheduleContext.targetDate;
  const amount = scheduleContext.scheduledAmount != null
    ? scheduleContext.scheduledAmount
    : computeAgreedScheduledAmount({
      remaining,
      deadline,
      now: at,
      frequency
    });
  if (amount != null && Number.isFinite(Number(amount))) {
    plan.scheduledAmount = Number(amount);
  }
  return plan;
}

function activateSchedule(plan, frequency, at, scheduleContext = {}) {
  const when = at instanceof Date ? at : new Date(at || Date.now());
  plan.frequency = frequency;
  plan.agreed = true;
  if (!plan.agreedAt) plan.agreedAt = when;
  plan.status = 'active';
  plan.nextContributionDate = firstDueDate(frequency, calendarDateKey(when));
  plan.pausedAt = undefined;
  assignScheduledAmount(plan, frequency, when, scheduleContext);
  return plan;
}

function buildCreatorContributionPlan(userId, frequency, at = new Date(), scheduleContext = {}) {
  const when = at instanceof Date ? at : new Date(at);
  return activateSchedule({
    user: userId,
    agreedAt: when
  }, frequency, when, scheduleContext);
}

function upsertUserContributionPlan(account, userId, frequency, agreedNow, at = new Date(), scheduleContext = {}) {
  if (!Array.isArray(account.contributionPlans)) {
    account.contributionPlans = [];
  }
  const context = {
    targetAmount: scheduleContext.targetAmount != null ? scheduleContext.targetAmount : account.targetAmount,
    plannedContributors: scheduleContext.plannedContributors != null
      ? scheduleContext.plannedContributors
      : plannedContributorCount(account),
    deadline: scheduleContext.deadline || scheduleContext.targetDate || account.targetDate,
    remaining: scheduleContext.remaining,
    scheduledAmount: scheduleContext.scheduledAmount
  };
  const existing = account.contributionPlans.find((plan) => String(plan.user) === String(userId));
  if (existing) {
    const status = planStatus(existing);
    if (status === 'cancelled' || status === 'completed') {
      return { error: 'This contribution plan is no longer active' };
    }
    existing.frequency = frequency;
    if (!existing.agreed) {
      if (!agreedNow) {
        return { error: 'Please agree to this contribution plan' };
      }
      activateSchedule(existing, frequency, at, context);
    } else if (status === 'active') {
      existing.nextContributionDate = firstDueDate(frequency, calendarDateKey(at));
      assignScheduledAmount(existing, frequency, at, context);
    } else if (status === 'paused') {
      assignScheduledAmount(existing, frequency, at, context);
    }
    return { plan: existing };
  }
  if (!agreedNow) {
    return { error: 'Please agree to this contribution plan' };
  }
  account.contributionPlans.push(buildCreatorContributionPlan(userId, frequency, at, context));
  return { plan: account.contributionPlans[account.contributionPlans.length - 1] };
}

function pauseUserContributionPlan(account, userId, at = new Date()) {
  const existing = (account.contributionPlans || []).find((plan) => String(plan.user) === String(userId));
  if (!existing || !existing.agreed) {
    return { error: 'No contribution plan to pause' };
  }
  const status = planStatus(existing);
  if (status !== 'active') {
    return { error: 'Only an active plan can be paused' };
  }
  existing.status = 'paused';
  existing.pausedAt = at instanceof Date ? at : new Date(at);
  return { plan: existing };
}

function resumeUserContributionPlan(account, userId, at = new Date()) {
  const existing = (account.contributionPlans || []).find((plan) => String(plan.user) === String(userId));
  if (!existing || !existing.agreed) {
    return { error: 'No contribution plan to resume' };
  }
  const status = planStatus(existing);
  if (status !== 'paused') {
    return { error: 'Only a paused plan can be resumed' };
  }
  const when = at instanceof Date ? at : new Date(at);
  existing.status = 'active';
  existing.pausedAt = undefined;
  existing.nextContributionDate = firstDueDate(existing.frequency, calendarDateKey(when));
  return { plan: existing };
}

function cancelUserContributionPlan(account, userId, at = new Date()) {
  const existing = (account.contributionPlans || []).find((plan) => String(plan.user) === String(userId));
  if (!existing || !existing.agreed) {
    return { error: 'No contribution plan to cancel' };
  }
  const status = planStatus(existing);
  if (status === 'cancelled') {
    return { error: 'This contribution plan is already cancelled' };
  }
  if (status === 'completed') {
    return { error: 'This contribution plan is already completed' };
  }
  existing.status = 'cancelled';
  existing.cancelledAt = at instanceof Date ? at : new Date(at);
  return { plan: existing };
}

function stopPlansForClosedAccount(account, at = new Date()) {
  const when = at instanceof Date ? at : new Date(at);
  (account.contributionPlans || []).forEach((plan) => {
    const status = planStatus(plan);
    if (status === 'active' || status === 'paused') {
      plan.status = 'cancelled';
      plan.cancelledAt = when;
    }
  });
}

function completePlan(plan) {
  if (!plan) return plan;
  const status = planStatus(plan);
  if (status === 'cancelled') return plan;
  plan.status = 'completed';
  return plan;
}

module.exports = {
  CONTRIBUTION_FREQUENCIES,
  CONTRIBUTION_PLAN_STATUSES,
  parseContributionFrequency,
  parseContributionAgreement,
  planStatus,
  activateSchedule,
  buildCreatorContributionPlan,
  upsertUserContributionPlan,
  pauseUserContributionPlan,
  resumeUserContributionPlan,
  cancelUserContributionPlan,
  stopPlansForClosedAccount,
  completePlan
};
