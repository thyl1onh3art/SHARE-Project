const fs = require('fs');
const path = require('path');
const {
  start,
  stop,
  shouldStartScheduler,
  isSchedulerRunning,
  OPT_IN_FLAG
} = require('../services/automaticContributionScheduler');

const ENV_KEYS = [OPT_IN_FLAG, 'NODE_ENV', 'VERCEL', 'DISABLE_AUTOMATIC_CONTRIBUTION_SCHEDULER'];

function snapshotEnv() {
  return ENV_KEYS.reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {});
}

function restoreEnv(snapshot) {
  ENV_KEYS.forEach((key) => {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  });
}

describe('prototype automatic contribution scheduler opt-in', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    stop();
    delete process.env[OPT_IN_FLAG];
    delete process.env.VERCEL;
    delete process.env.DISABLE_AUTOMATIC_CONTRIBUTION_SCHEDULER;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    stop();
    restoreEnv(envSnapshot);
  });

  it('does not start when the opt-in flag is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env[OPT_IN_FLAG];
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('does not start when the opt-in flag is blank', () => {
    process.env.NODE_ENV = 'development';
    process.env[OPT_IN_FLAG] = '';
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('does not start when the opt-in flag is false', () => {
    process.env.NODE_ENV = 'development';
    process.env[OPT_IN_FLAG] = 'false';
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('does not start when the opt-in flag is anything other than exact true', () => {
    process.env.NODE_ENV = 'development';
    ['TRUE', 'True', '1', 'yes', 'true '].forEach((value) => {
      process.env[OPT_IN_FLAG] = value;
      expect(shouldStartScheduler()).toBe(false);
    });
  });

  it('may start when ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS is exactly true', () => {
    process.env.NODE_ENV = 'development';
    process.env[OPT_IN_FLAG] = 'true';
    expect(shouldStartScheduler()).toBe(true);
    start();
    expect(isSchedulerRunning()).toBe(true);
    stop();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('does not start in NODE_ENV=test even if the opt-in flag is true', () => {
    process.env.NODE_ENV = 'test';
    process.env[OPT_IN_FLAG] = 'true';
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('does not start on Vercel even if the opt-in flag is true', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
    process.env[OPT_IN_FLAG] = 'true';
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);
  });

  it('logs disabled when start is called without opt-in', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';
    start();
    expect(log).toHaveBeenCalledWith('Prototype automatic contribution scheduler disabled');
    log.mockRestore();
  });

  it('logs enabled when start is called with opt-in', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';
    process.env[OPT_IN_FLAG] = 'true';
    start();
    expect(log).toHaveBeenCalledWith('Prototype automatic contribution scheduler enabled');
    stop();
    log.mockRestore();
  });

  it('ignores the deprecated DISABLE_AUTOMATIC_CONTRIBUTION_SCHEDULER flag', () => {
    process.env.NODE_ENV = 'development';
    process.env[OPT_IN_FLAG] = 'true';
    process.env.DISABLE_AUTOMATIC_CONTRIBUTION_SCHEDULER = 'true';
    expect(shouldStartScheduler()).toBe(true);
  });
});

describe('manual development processor remains independent of the scheduler', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    stop();
    delete process.env[OPT_IN_FLAG];
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    stop();
    restoreEnv(envSnapshot);
  });

  it('does not gate the development process endpoint on the scheduler opt-in flag', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../controllers/sharedAccountController.js'),
      'utf8'
    );
    expect(src).toContain("process.env.NODE_ENV !== 'production'");
    expect(src).not.toContain('ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS');
    expect(src).not.toContain('shouldStartScheduler');
    expect(src).not.toContain('automaticContributionScheduler');
  });

  it('does not gate automaticContributionService on the scheduler opt-in flag', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../services/automaticContributionService.js'),
      'utf8'
    );
    expect(src).not.toContain('ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS');
    expect(src).not.toContain('shouldStartScheduler');
  });

  it('still processes due plans while the background scheduler is off', async () => {
    const mongoose = require('mongoose');
    const { createAutomaticContributionService } = require('../services/automaticContributionService');

    process.env.NODE_ENV = 'development';
    delete process.env[OPT_IN_FLAG];
    expect(shouldStartScheduler()).toBe(false);
    start();
    expect(isSchedulerRunning()).toBe(false);

    const records = [];
    class MemoryFinanceRecord {
      constructor(doc) {
        Object.assign(this, doc);
        this._id = this._id || new mongoose.Types.ObjectId();
      }

      async save() {
        records.push(this);
        return this;
      }
    }
    MemoryFinanceRecord.find = async () => records.slice();
    MemoryFinanceRecord.findOne = async () => null;

    const userId = new mongoose.Types.ObjectId();
    const account = {
      _id: new mongoose.Types.ObjectId(),
      owner: userId,
      members: [],
      targetAmount: 100,
      plannedContributors: 1,
      isDeleted: false,
      contributionPlans: [{
        user: userId,
        frequency: 'weekly',
        agreed: true,
        status: 'active',
        nextContributionDate: '2026-09-07',
        scheduledAmount: 25
      }],
      async save() {
        return this;
      }
    };

    const service = createAutomaticContributionService({
      SharedAccount: {
        find: async () => [account]
      },
      FinanceRecord: MemoryFinanceRecord,
      PaymentRequest: {
        find: async () => []
      }
    });

    const results = await service.processDuePlans({
      now: new Date(2026, 8, 7, 12),
      userId
    });
    expect(results[0].action).toBe('created');
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(25);
    stop();
  });
});
