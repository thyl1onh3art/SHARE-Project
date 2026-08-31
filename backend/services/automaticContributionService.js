const { contributionProgressTotal } = require('../utils/contributionProgress');
const {
  calendarDateKey,
  isDueOnOrBefore,
  advanceDueDate,
  processorKey
} = require('../utils/automaticContributionDates');
const {
  plannedContributorCount,
  plannedPersonalShare,
  scheduledAutomaticAmount,
  userInputTotal
} = require('../utils/automaticContributionAmounts');
const {
  planStatus,
  completePlan,
  stopPlansForClosedAccount
} = require('../utils/contributionPlan');

const MAX_CATCH_UP_PER_PLAN = 52;
const AUTOMATIC_DESCRIPTION = 'Automatic contribution';

function isDuplicateKeyError(err) {
  return Boolean(err && (err.code === 11000 || (err.message && String(err.message).includes('E11000'))));
}

function createAutomaticContributionService(deps = {}) {
  const SharedAccount = deps.SharedAccount || require('../models/SharedAccount');
  const FinanceRecord = deps.FinanceRecord || require('../models/FinanceRecord');
  const PaymentRequest = deps.PaymentRequest || require('../models/PaymentRequest');

  async function loadLedger(accountId) {
    const [records, payments] = await Promise.all([
      FinanceRecord.find({ sharedAccount: accountId }),
      PaymentRequest.find({ sharedAccount: accountId })
    ]);
    return { records, payments };
  }

  function remainingSnapshot(account, records, payments, userId) {
    const userContributed = userInputTotal(records, userId);
    const totalContributed = contributionProgressTotal(records, payments);
    const plannedShare = plannedPersonalShare(
      account.targetAmount,
      plannedContributorCount(account)
    );
    const remainingPersonal = Math.max(
      0,
      Math.round(((plannedShare || 0) - userContributed) * 100) / 100
    );
    const overallRemaining = Math.max(
      0,
      Math.round((Math.max(0, Number(account.targetAmount) || 0) - totalContributed) * 100) / 100
    );
    return { userContributed, totalContributed, remainingPersonal, overallRemaining };
  }

  function shouldComplete(snapshot) {
    return snapshot.remainingPersonal <= 0 || snapshot.overallRemaining <= 0;
  }

  function reconcilePlans(account, snapshotForUser) {
    (account.contributionPlans || []).forEach((plan) => {
      const status = planStatus(plan);
      if (status !== 'active' && status !== 'paused') return;
      const snapshot = snapshotForUser(plan.user);
      if (shouldComplete(snapshot)) {
        completePlan(plan);
      }
    });
  }

  async function createAutomaticRecord({ account, plan, amount, scheduledFor, now }) {
    const key = processorKey(account._id, plan.user, scheduledFor);
    const record = new FinanceRecord({
      user: plan.user,
      type: 'input',
      amount,
      date: now instanceof Date ? now : new Date(now),
      description: AUTOMATIC_DESCRIPTION,
      sharedAccount: account._id,
      source: 'automatic',
      contributionPlanId: plan._id,
      scheduledFor,
      processorKey: key
    });
    try {
      await record.save();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await FinanceRecord.findOne({ processorKey: key });
        return { record: existing, created: false, processorKey: key };
      }
      throw err;
    }
    if (!Array.isArray(account.financeRecords)) {
      account.financeRecords = [];
    }
    const alreadyLinked = account.financeRecords.some((id) => String(id) === String(record._id));
    if (!alreadyLinked) {
      account.financeRecords.push(record._id);
    }
    return { record, created: true, processorKey: key };
  }

  async function processOneDuePlan(account, plan, today, now, options) {
    const status = planStatus(plan);
    if (status !== 'active') {
      return { action: 'skipped', reason: status || 'inactive' };
    }
    if (account.isDeleted) {
      stopPlansForClosedAccount(account, now);
      return { action: 'skipped', reason: 'archived' };
    }
    const scheduledFor = calendarDateKey(plan.nextContributionDate);
    if (!scheduledFor || !isDueOnOrBefore(scheduledFor, today)) {
      return { action: 'skipped', reason: 'not-due' };
    }
    if (options.simulateFailure) {
      return { action: 'failed', reason: 'simulated', scheduledFor };
    }

    const { records, payments } = await loadLedger(account._id);
    const snapshot = remainingSnapshot(account, records, payments, plan.user);
    if (shouldComplete(snapshot)) {
      completePlan(plan);
      return { action: 'completed', reason: snapshot.overallRemaining <= 0 ? 'target-reached' : 'share-reached' };
    }

    const amount = scheduledAutomaticAmount({
      targetAmount: account.targetAmount,
      plannedContributors: plannedContributorCount(account),
      userContributed: snapshot.userContributed,
      totalContributed: snapshot.totalContributed,
      deadline: account.targetDate,
      now,
      frequency: plan.frequency,
      scheduledAmount: plan.scheduledAmount
    });

    if (!(amount > 0)) {
      completePlan(plan);
      return { action: 'completed', reason: 'zero-amount' };
    }

    const saved = await createAutomaticRecord({ account, plan, amount, scheduledFor, now });
    plan.lastProcessedAt = now instanceof Date ? now : new Date(now);
    plan.nextContributionDate = advanceDueDate(plan.frequency, scheduledFor);

    const afterRecords = saved.created
      ? [...records, saved.record]
      : records;
    const after = remainingSnapshot(account, afterRecords, payments, plan.user);
    if (shouldComplete(after)) {
      completePlan(plan);
    }

    return {
      action: saved.created ? 'created' : 'idempotent',
      amount,
      scheduledFor,
      processorKey: saved.processorKey,
      recordId: saved.record && saved.record._id
    };
  }

  async function processDuePlans({ now = new Date(), userId = null, simulateFailure = false } = {}) {
    const today = calendarDateKey(now);
    const filter = { isDeleted: { $ne: true } };
    if (userId) {
      filter.$or = [{ owner: userId }, { members: userId }];
    }

    const accounts = await SharedAccount.find(filter);
    const results = [];

    for (const account of accounts) {
      const { records, payments } = await loadLedger(account._id);
      reconcilePlans(account, (planUserId) => remainingSnapshot(account, records, payments, planUserId));

      for (const plan of account.contributionPlans || []) {
        if (userId && String(plan.user) !== String(userId)) continue;
        let guard = 0;
        while (guard < MAX_CATCH_UP_PER_PLAN) {
          guard += 1;
          const outcome = await processOneDuePlan(account, plan, today, now, { simulateFailure });
          results.push({
            sharedAccountId: String(account._id),
            userId: String(plan.user),
            ...outcome
          });
          if (outcome.action !== 'created' && outcome.action !== 'idempotent') break;
          if (!isDueOnOrBefore(plan.nextContributionDate, today)) break;
        }
      }

      await account.save();
    }

    return results;
  }

  async function reconcileAccount(account, at = new Date()) {
    if (!account) return account;
    if (account.isDeleted) {
      stopPlansForClosedAccount(account, at);
      return account;
    }
    const { records, payments } = await loadLedger(account._id);
    reconcilePlans(account, (planUserId) => remainingSnapshot(account, records, payments, planUserId));
    return account;
  }

  async function reconcileAccountById(accountId) {
    const account = await SharedAccount.findById(accountId);
    if (!account) return null;
    await reconcileAccount(account);
    await account.save();
    return account;
  }

  return {
    processDuePlans,
    reconcileAccount,
    reconcileAccountById,
    AUTOMATIC_DESCRIPTION,
    MAX_CATCH_UP_PER_PLAN
  };
}

const defaultService = createAutomaticContributionService();

module.exports = defaultService;
module.exports.createAutomaticContributionService = createAutomaticContributionService;
