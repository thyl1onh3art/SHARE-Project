const mongoose = require('mongoose');
const { createAutomaticContributionService } = require('../services/automaticContributionService');
const { firstDueDate } = require('../utils/automaticContributionDates');
const {
  buildCreatorContributionPlan,
  upsertUserContributionPlan,
  pauseUserContributionPlan,
  resumeUserContributionPlan,
  cancelUserContributionPlan,
  stopPlansForClosedAccount,
  planStatus
} = require('../utils/contributionPlan');
const SharedAccount = require('../models/SharedAccount');
const FinanceRecord = require('../models/FinanceRecord');

function futureDeadline() {
  return new Date(2026, 9, 25, 0, 0, 0, 0);
}

function makeMemory() {
  const accounts = [];
  const records = [];
  const payments = [];

  class MemoryFinanceRecord {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || new mongoose.Types.ObjectId();
    }

    async save() {
      if (this.processorKey && records.some((row) => row.processorKey === this.processorKey)) {
        const err = new Error('E11000 duplicate key error collection: financerecords index: processorKey_1');
        err.code = 11000;
        throw err;
      }
      records.push(this);
      return this;
    }
  }

  MemoryFinanceRecord.find = async (query) => records.filter((row) => (
    String(row.sharedAccount) === String(query.sharedAccount)
  ));
  MemoryFinanceRecord.findOne = async (query) => records.find((row) => (
    row.processorKey === query.processorKey
  )) || null;

  const SharedAccountModel = {
    find: async (query) => accounts.filter((account) => {
      if (query.isDeleted && query.isDeleted.$ne === true && account.isDeleted) return false;
      if (query.$or && query.$or.length) {
        const userId = String(query.$or[0].owner || query.$or[1].members);
        const ownerMatch = String(account.owner) === userId;
        const memberMatch = (account.members || []).some((id) => String(id) === userId);
        if (!ownerMatch && !memberMatch) return false;
      }
      return true;
    })
  };

  const PaymentRequestModel = {
    find: async (query) => payments.filter((row) => String(row.sharedAccount) === String(query.sharedAccount))
  };

  function addAccount(overrides) {
    const owner = overrides.owner || new mongoose.Types.ObjectId();
    const account = {
      _id: overrides._id || new mongoose.Types.ObjectId(),
      owner,
      members: overrides.members || [],
      name: overrides.name || 'Savings Test',
      targetAmount: overrides.targetAmount === undefined ? 200 : overrides.targetAmount,
      targetDate: overrides.targetDate || futureDeadline(),
      plannedContributors: overrides.plannedContributors === undefined ? 2 : overrides.plannedContributors,
      isDeleted: !!overrides.isDeleted,
      contributionPlans: overrides.contributionPlans || [],
      financeRecords: overrides.financeRecords || [],
      async save() {
        return this;
      }
    };
    accounts.push(account);
    return account;
  }

  const service = createAutomaticContributionService({
    SharedAccount: SharedAccountModel,
    FinanceRecord: MemoryFinanceRecord,
    PaymentRequest: PaymentRequestModel
  });

  return { accounts, records, payments, addAccount, service, MemoryFinanceRecord };
}

describe('contribution plan creation schedule', () => {
  it('agreed creator plans become active with a weekly first due date', () => {
    const userId = new mongoose.Types.ObjectId();
    const agreedAt = new Date(2026, 7, 23, 12);
    const plan = buildCreatorContributionPlan(userId, 'weekly', agreedAt);
    expect(plan.status).toBe('active');
    expect(plan.agreed).toBe(true);
    expect(String(plan.user)).toBe(String(userId));
    expect(plan.nextContributionDate).toBe(firstDueDate('weekly', '2026-08-23'));
  });

  it('stores fortnightly and monthly first due dates from the agreement date', () => {
    const userId = new mongoose.Types.ObjectId();
    expect(buildCreatorContributionPlan(userId, 'fortnightly', new Date(2026, 7, 16, 12)).nextContributionDate)
      .toBe('2026-08-30');
    expect(buildCreatorContributionPlan(userId, 'monthly', new Date(2026, 6, 30, 12)).nextContributionDate)
      .toBe('2026-08-30');
  });

  it('keeps each plan on the matching user and account', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const account = {
      owner: ownerId,
      contributionPlans: [buildCreatorContributionPlan(ownerId, 'weekly', new Date(2026, 7, 23, 12))]
    };
    upsertUserContributionPlan(account, memberId, 'monthly', true, new Date(2026, 7, 23, 12));
    expect(account.contributionPlans).toHaveLength(2);
    expect(String(account.contributionPlans[0].user)).toBe(String(ownerId));
    expect(String(account.contributionPlans[1].user)).toBe(String(memberId));
    expect(account.contributionPlans[1].frequency).toBe('monthly');
  });

  it('persists a £25 weekly agreed amount for £100 due 28 September from 31 August', () => {
    const userId = new mongoose.Types.ObjectId();
    const plan = buildCreatorContributionPlan(
      userId,
      'weekly',
      new Date(2026, 7, 31, 12),
      {
        targetAmount: 100,
        plannedContributors: 1,
        targetDate: new Date(2026, 8, 28)
      }
    );
    expect(plan.scheduledAmount).toBe(25);
    expect(plan.nextContributionDate).toBe('2026-09-07');
  });
});

describe('automaticContributionService processing', () => {
  const dueNow = new Date(2026, 7, 30, 12, 0, 0, 0);

  function activeWeeklyPlan(userId, extras = {}) {
    return {
      _id: extras._id || new mongoose.Types.ObjectId(),
      user: userId,
      frequency: extras.frequency || 'weekly',
      agreed: true,
      agreedAt: new Date(2026, 7, 23, 12),
      status: extras.status || 'active',
      nextContributionDate: extras.nextContributionDate || '2026-08-30',
      ...extras
    };
  }

  it('creates one simulated contribution for a due active plan', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    const results = await service.processDuePlans({ now: dueNow });
    expect(results.some((row) => row.action === 'created')).toBe(true);
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(12.5);
    expect(records[0].source).toBe('automatic');
    expect(records[0].description).toBe('Automatic contribution');
    expect(records[0].processorKey).toMatch(/:2026-08-30$/);
  });

  it('does nothing for a plan that is not yet due', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({
      owner: userId,
      contributionPlans: [activeWeeklyPlan(userId, { nextContributionDate: '2026-09-06' })]
    });
    const results = await service.processDuePlans({ now: dueNow });
    expect(records).toHaveLength(0);
    expect(results.every((row) => row.action === 'skipped')).toBe(true);
  });

  it('does not process paused, cancelled, or completed plans', async () => {
    const { addAccount, records, service } = makeMemory();
    const pausedUser = new mongoose.Types.ObjectId();
    const cancelledUser = new mongoose.Types.ObjectId();
    const completedUser = new mongoose.Types.ObjectId();
    addAccount({
      owner: pausedUser,
      members: [cancelledUser, completedUser],
      plannedContributors: 3,
      contributionPlans: [
        activeWeeklyPlan(pausedUser, { status: 'paused' }),
        activeWeeklyPlan(cancelledUser, { status: 'cancelled' }),
        activeWeeklyPlan(completedUser, { status: 'completed' })
      ]
    });
    await service.processDuePlans({ now: dueNow });
    expect(records).toHaveLength(0);
  });

  it('does not process archived Shared Accounts', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({
      owner: userId,
      isDeleted: true,
      contributionPlans: [activeWeeklyPlan(userId)]
    });
    await service.processDuePlans({ now: dueNow });
    expect(records).toHaveLength(0);
  });

  it('reduces personal remaining after an automatic contribution', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    await service.processDuePlans({ now: dueNow });
    expect(records[0].amount).toBe(12.5);
    expect(account.contributionPlans[0].nextContributionDate).toBe('2026-09-06');
  });

  it('reduces the final automatic amount to remaining personal share', async () => {
    const { addAccount, records, service, MemoryFinanceRecord } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    records.push(new MemoryFinanceRecord({
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      type: 'input',
      amount: 90,
      sharedAccount: account._id,
      source: 'manual'
    }));
    account.targetDate = new Date(2026, 8, 5, 0, 0, 0, 0);
    await service.processDuePlans({ now: dueNow });
    const automatic = records.filter((row) => row.source === 'automatic');
    expect(automatic).toHaveLength(1);
    expect(automatic[0].amount).toBe(10);
    expect(account.contributionPlans[0].status).toBe('completed');
  });

  it('caps automatic amount at the Shared Account target', async () => {
    const { addAccount, records, service, MemoryFinanceRecord } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const other = new mongoose.Types.ObjectId();
    const account = addAccount({
      owner: userId,
      members: [other],
      contributionPlans: [activeWeeklyPlan(userId)]
    });
    records.push(new MemoryFinanceRecord({
      user: other,
      type: 'input',
      amount: 195,
      sharedAccount: account._id
    }));
    await service.processDuePlans({ now: dueNow });
    expect(records.filter((row) => row.source === 'automatic')[0].amount).toBe(5);
  });

  it('creates only one contribution when the same due plan is processed twice', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    await service.processDuePlans({ now: dueNow });
    await service.processDuePlans({ now: dueNow });
    expect(records.filter((row) => row.source === 'automatic')).toHaveLength(1);
  });

  it('repeated scheduler checks keep a durable processor key unique', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    await service.processDuePlans({ now: dueNow });
    await service.processDuePlans({ now: dueNow });
    await service.processDuePlans({ now: dueNow });
    const automatic = records.filter((row) => row.source === 'automatic');
    expect(automatic).toHaveLength(1);
    expect(new Set(automatic.map((row) => row.processorKey)).size).toBe(1);
  });

  it('advances weekly, fortnightly, and monthly due dates after processing', async () => {
    const { addAccount, service } = makeMemory();
    const weeklyUser = new mongoose.Types.ObjectId();
    const fortnightUser = new mongoose.Types.ObjectId();
    const monthlyUser = new mongoose.Types.ObjectId();
    const weekly = addAccount({
      owner: weeklyUser,
      plannedContributors: 2,
      contributionPlans: [activeWeeklyPlan(weeklyUser)]
    });
    const fortnight = addAccount({
      owner: fortnightUser,
      plannedContributors: 2,
      contributionPlans: [activeWeeklyPlan(fortnightUser, { frequency: 'fortnightly' })]
    });
    const monthly = addAccount({
      owner: monthlyUser,
      plannedContributors: 2,
      contributionPlans: [activeWeeklyPlan(monthlyUser, { frequency: 'monthly' })]
    });
    await service.processDuePlans({ now: dueNow });
    expect(weekly.contributionPlans[0].nextContributionDate).toBe('2026-09-06');
    expect(fortnight.contributionPlans[0].nextContributionDate).toBe('2026-09-13');
    expect(monthly.contributionPlans[0].nextContributionDate).toBe('2026-09-30');
  });

  it('completes the plan when the personal share is covered', async () => {
    const { addAccount, service, MemoryFinanceRecord, records } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    records.push(new MemoryFinanceRecord({
      user: userId,
      type: 'input',
      amount: 100,
      sharedAccount: account._id
    }));
    await service.processDuePlans({ now: dueNow });
    expect(account.contributionPlans[0].status).toBe('completed');
    expect(records.filter((row) => row.source === 'automatic')).toHaveLength(0);
  });

  it('stops automatic processing when a manual contribution covers the share', async () => {
    const { addAccount, service, MemoryFinanceRecord, records } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    records.push(new MemoryFinanceRecord({
      user: userId,
      type: 'input',
      amount: 100,
      sharedAccount: account._id,
      source: 'manual'
    }));
    await service.reconcileAccount(account);
    expect(account.contributionPlans[0].status).toBe('completed');
  });

  it('stops automatic processing when the account target is already reached', async () => {
    const { addAccount, service, MemoryFinanceRecord, records } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const other = new mongoose.Types.ObjectId();
    const account = addAccount({
      owner: userId,
      members: [other],
      contributionPlans: [activeWeeklyPlan(userId)]
    });
    records.push(new MemoryFinanceRecord({
      user: other,
      type: 'input',
      amount: 200,
      sharedAccount: account._id
    }));
    await service.processDuePlans({ now: dueNow });
    expect(account.contributionPlans[0].status).toBe('completed');
    expect(records.filter((row) => row.source === 'automatic')).toHaveLength(0);
  });

  it('records the agreed £25 weekly instalment on 7 September and keeps the next amount at £25', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({
      owner: userId,
      plannedContributors: 1,
      members: [],
      targetAmount: 100,
      targetDate: new Date(2026, 8, 28),
      contributionPlans: [activeWeeklyPlan(userId, {
        scheduledAmount: 25,
        nextContributionDate: '2026-09-07'
      })]
    });
    await service.processDuePlans({ now: new Date(2026, 8, 7, 12) });
    expect(records.filter((row) => row.source === 'automatic')).toHaveLength(1);
    expect(records[0].amount).toBe(25);
    expect(account.contributionPlans[0].nextContributionDate).toBe('2026-09-14');
    expect(account.contributionPlans[0].scheduledAmount).toBe(25);

    await service.processDuePlans({ now: new Date(2026, 8, 7, 12) });
    expect(records.filter((row) => row.source === 'automatic')).toHaveLength(1);

    await service.processDuePlans({ now: new Date(2026, 8, 14, 12) });
    const automatic = records.filter((row) => row.source === 'automatic');
    expect(automatic).toHaveLength(2);
    expect(automatic[1].amount).toBe(25);
    expect(account.contributionPlans[0].nextContributionDate).toBe('2026-09-21');
  });

  it('caps the final agreed instalment when remaining personal share is smaller', async () => {
    const { addAccount, records, service, MemoryFinanceRecord } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    const account = addAccount({
      owner: userId,
      plannedContributors: 1,
      members: [],
      targetAmount: 100,
      targetDate: new Date(2026, 8, 28),
      contributionPlans: [activeWeeklyPlan(userId, {
        scheduledAmount: 25,
        nextContributionDate: '2026-09-21'
      })]
    });
    records.push(new MemoryFinanceRecord({
      user: userId,
      type: 'input',
      amount: 80,
      sharedAccount: account._id
    }));
    await service.processDuePlans({ now: new Date(2026, 8, 21, 12) });
    const automatic = records.filter((row) => row.source === 'automatic');
    expect(automatic).toHaveLength(1);
    expect(automatic[0].amount).toBe(20);
    expect(account.contributionPlans[0].status).toBe('completed');
  });

  it('processes a legacy plan without scheduledAmount without throwing', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({
      owner: userId,
      plannedContributors: 1,
      members: [],
      targetAmount: 100,
      targetDate: new Date(2026, 8, 28),
      contributionPlans: [activeWeeklyPlan(userId, {
        nextContributionDate: '2026-09-07'
      })]
    });
    await service.processDuePlans({ now: new Date(2026, 8, 7, 12) });
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBeGreaterThan(0);
  });

  it('can simulate a processing failure without creating a contribution', async () => {
    const { addAccount, records, service } = makeMemory();
    const userId = new mongoose.Types.ObjectId();
    addAccount({ owner: userId, contributionPlans: [activeWeeklyPlan(userId)] });
    const results = await service.processDuePlans({ now: dueNow, simulateFailure: true });
    expect(results[0].action).toBe('failed');
    expect(records).toHaveLength(0);
  });

  it('processes only the authenticated user when userId is supplied', async () => {
    const { addAccount, records, service } = makeMemory();
    const owner = new mongoose.Types.ObjectId();
    const member = new mongoose.Types.ObjectId();
    addAccount({
      owner,
      members: [member],
      contributionPlans: [
        activeWeeklyPlan(owner),
        activeWeeklyPlan(member)
      ]
    });
    await service.processDuePlans({ now: dueNow, userId: owner });
    expect(records).toHaveLength(1);
    expect(String(records[0].user)).toBe(String(owner));
  });
});

describe('pause resume cancel and frequency change', () => {
  it('pauses an active plan and resume recalculates next date from resume date', () => {
    const userId = new mongoose.Types.ObjectId();
    const account = {
      contributionPlans: [buildCreatorContributionPlan(userId, 'weekly', new Date(2026, 7, 23, 12))]
    };
    expect(pauseUserContributionPlan(account, userId).plan.status).toBe('paused');
    const resumed = resumeUserContributionPlan(account, userId, new Date(2026, 8, 1, 12));
    expect(resumed.plan.status).toBe('active');
    expect(resumed.plan.nextContributionDate).toBe('2026-09-08');
  });

  it('cancels a plan without deleting it', () => {
    const userId = new mongoose.Types.ObjectId();
    const account = {
      contributionPlans: [buildCreatorContributionPlan(userId, 'weekly', new Date(2026, 7, 23, 12))]
    };
    const cancelled = cancelUserContributionPlan(account, userId, new Date(2026, 7, 30, 12));
    expect(cancelled.plan.status).toBe('cancelled');
    expect(account.contributionPlans).toHaveLength(1);
    expect(cancelled.plan.agreed).toBe(true);
  });

  it('changing frequency updates next date for that user only', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const account = {
      contributionPlans: [
        buildCreatorContributionPlan(ownerId, 'weekly', new Date(2026, 7, 23, 12)),
        buildCreatorContributionPlan(memberId, 'weekly', new Date(2026, 7, 23, 12))
      ]
    };
    upsertUserContributionPlan(account, ownerId, 'monthly', true, new Date(2026, 7, 30, 12));
    expect(account.contributionPlans[0].frequency).toBe('monthly');
    expect(account.contributionPlans[0].nextContributionDate).toBe('2026-09-30');
    expect(account.contributionPlans[1].frequency).toBe('weekly');
    expect(account.contributionPlans[1].nextContributionDate).toBe('2026-08-30');
  });

  it('recalculates and persists a new agreed amount when frequency changes', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const account = {
      owner: ownerId,
      targetAmount: 100,
      plannedContributors: 1,
      targetDate: new Date(2026, 8, 28),
      contributionPlans: [
        buildCreatorContributionPlan(ownerId, 'weekly', new Date(2026, 7, 31, 12), {
          targetAmount: 100,
          plannedContributors: 1,
          targetDate: new Date(2026, 8, 28)
        })
      ]
    };
    expect(account.contributionPlans[0].scheduledAmount).toBe(25);
    upsertUserContributionPlan(account, ownerId, 'monthly', true, new Date(2026, 7, 31, 12), {
      remaining: 100,
      deadline: new Date(2026, 8, 28)
    });
    expect(account.contributionPlans[0].frequency).toBe('monthly');
    expect(account.contributionPlans[0].scheduledAmount).toBe(100);
  });

  it('does not let one user pause another user plan through the helper', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const account = {
      contributionPlans: [buildCreatorContributionPlan(ownerId, 'weekly', new Date(2026, 7, 23, 12))]
    };
    expect(pauseUserContributionPlan(account, memberId).error).toBeDefined();
    expect(planStatus(account.contributionPlans[0])).toBe('active');
  });

  it('marks active and paused plans cancelled when a Shared Account is closed', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const memberId = new mongoose.Types.ObjectId();
    const account = {
      contributionPlans: [
        buildCreatorContributionPlan(ownerId, 'weekly', new Date(2026, 7, 23, 12)),
        { ...buildCreatorContributionPlan(memberId, 'weekly', new Date(2026, 7, 23, 12)), status: 'paused' }
      ]
    };
    stopPlansForClosedAccount(account, new Date(2026, 8, 1, 12));
    expect(account.contributionPlans.every((plan) => plan.status === 'cancelled')).toBe(true);
  });
});

describe('SharedAccount and FinanceRecord schema for prototype automatic payments', () => {
  it('accepts plan status and nextContributionDate on a per-user plan', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const doc = new SharedAccount({
      owner: ownerId,
      name: 'Holiday',
      plannedContributors: 2,
      contributionPlans: [{
        user: ownerId,
        frequency: 'weekly',
        agreed: true,
        agreedAt: new Date(),
        status: 'active',
        nextContributionDate: '2026-09-06',
        scheduledAmount: 25
      }]
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.contributionPlans[0].scheduledAmount).toBe(25);
  });

  it('accepts automatic source metadata and a processor key on FinanceRecord', () => {
    const doc = new FinanceRecord({
      user: new mongoose.Types.ObjectId(),
      type: 'input',
      amount: 12.5,
      source: 'automatic',
      scheduledFor: '2026-08-30',
      processorKey: 'acc:user:2026-08-30',
      description: 'Automatic contribution'
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.source).toBe('automatic');
  });

  it('still allows historical plans without status', () => {
    const ownerId = new mongoose.Types.ObjectId();
    const doc = new SharedAccount({
      owner: ownerId,
      name: 'Legacy',
      contributionPlans: [{
        user: ownerId,
        frequency: 'weekly',
        agreed: true,
        agreedAt: new Date()
      }]
    });
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.contributionPlans[0].status).toBeUndefined();
  });
});
