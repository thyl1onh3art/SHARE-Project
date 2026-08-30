const mongoose = require('mongoose');
const SharedAccount = require('../models/SharedAccount');
const { parsePlannedContributors, MAX_PLANNED_CONTRIBUTORS } = require('../utils/plannedContributors');

describe('parsePlannedContributors', () => {
  it('requires a whole number of at least 1', () => {
    expect(parsePlannedContributors('')).toEqual({
      error: 'How many people will contribute is required'
    });
    expect(parsePlannedContributors(0).error).toMatch(/at least 1/i);
    expect(parsePlannedContributors(-1).error).toMatch(/whole number/i);
    expect(parsePlannedContributors(2.5).error).toMatch(/whole number/i);
    expect(parsePlannedContributors(4)).toEqual({ value: 4 });
    expect(parsePlannedContributors(MAX_PLANNED_CONTRIBUTORS + 1).error).toMatch(/at most/i);
  });
});

describe('SharedAccount plannedContributors schema', () => {
  it('allows historical documents without plannedContributors', () => {
    const doc = new SharedAccount({
      owner: new mongoose.Types.ObjectId(),
      name: 'Legacy pot'
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.plannedContributors).toBeUndefined();
    expect(Array.isArray(doc.contributionPlans) ? doc.contributionPlans.length : 0).toBe(0);
  });

  it('rejects zero when the field is set', () => {
    const doc = new SharedAccount({
      owner: new mongoose.Types.ObjectId(),
      name: 'New pot',
      plannedContributors: 0
    });
    expect(doc.validateSync()?.errors?.plannedContributors).toBeDefined();
  });
});

const { parseContributionFrequency, parseContributionAgreement } = require('../utils/contributionPlan');

describe('per-user contribution plan parsers', () => {
  it('requires an explicit frequency and agreement', () => {
    expect(parseContributionFrequency('').error).toMatch(/how often/i);
    expect(parseContributionFrequency('daily').error).toMatch(/weekly/i);
    expect(parseContributionFrequency('weekly')).toEqual({ value: 'weekly' });
    expect(parseContributionAgreement(false).error).toMatch(/agree/i);
    expect(parseContributionAgreement(true)).toEqual({ value: true });
  });

  it('stores separate user plans on one Shared Account', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const doc = new SharedAccount({
      owner: ownerId,
      name: 'Holiday',
      plannedContributors: 2,
      contributionPlans: [
        { user: ownerId, frequency: 'weekly', agreed: true, agreedAt: new Date() },
        { user: memberId, frequency: 'monthly', agreed: true, agreedAt: new Date() }
      ]
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.contributionPlans).toHaveLength(2);
    expect(doc.contributionPlans[0].frequency).toBe('weekly');
    expect(doc.contributionPlans[1].frequency).toBe('monthly');
  });
});
