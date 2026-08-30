const CONTRIBUTION_FREQUENCIES = ['weekly', 'fortnightly', 'monthly'];

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

function buildCreatorContributionPlan(userId, frequency) {
  return {
    user: userId,
    frequency,
    agreed: true,
    agreedAt: new Date()
  };
}

function upsertUserContributionPlan(account, userId, frequency, agreedNow) {
  if (!Array.isArray(account.contributionPlans)) {
    account.contributionPlans = [];
  }
  const existing = account.contributionPlans.find((plan) => String(plan.user) === String(userId));
  if (existing) {
    existing.frequency = frequency;
    if (!existing.agreed) {
      if (!agreedNow) {
        return { error: 'Please agree to this contribution plan' };
      }
      existing.agreed = true;
      existing.agreedAt = new Date();
    }
    return { plan: existing };
  }
  if (!agreedNow) {
    return { error: 'Please agree to this contribution plan' };
  }
  account.contributionPlans.push(buildCreatorContributionPlan(userId, frequency));
  return { plan: account.contributionPlans[account.contributionPlans.length - 1] };
}

module.exports = {
  CONTRIBUTION_FREQUENCIES,
  parseContributionFrequency,
  parseContributionAgreement,
  buildCreatorContributionPlan,
  upsertUserContributionPlan
};
