const {
  scheduledAutomaticAmount,
  remainingPersonalAmount,
  plannedPersonalShare,
  computeAgreedScheduledAmount
} = require('../utils/automaticContributionAmounts');

describe('automatic contribution amounts', () => {
  it('agrees £25 weekly for £100 over 28 days to 28 September', () => {
    expect(computeAgreedScheduledAmount({
      remaining: 100,
      deadline: '2026-09-28',
      now: new Date(2026, 7, 31, 12),
      frequency: 'weekly'
    })).toBe(25);
  });

  it('uses the persisted agreed instalment instead of recasting from the process date', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 100,
      plannedContributors: 1,
      userContributed: 0,
      totalContributed: 0,
      deadline: '2026-09-28',
      now: new Date(2026, 8, 7, 12),
      frequency: 'weekly',
      scheduledAmount: 25
    });
    expect(amount).toBe(25);
  });

  it('would recast to £33.34 without a persisted amount (legacy fallback)', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 100,
      plannedContributors: 1,
      userContributed: 0,
      totalContributed: 0,
      deadline: '2026-09-28',
      now: new Date(2026, 8, 7, 12),
      frequency: 'weekly'
    });
    expect(amount).toBe(33.34);
  });

  it('caps a persisted instalment when less than the agreed amount remains', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 100,
      plannedContributors: 1,
      userContributed: 80,
      totalContributed: 80,
      deadline: '2026-09-28',
      now: new Date(2026, 8, 21, 12),
      frequency: 'weekly',
      scheduledAmount: 25
    });
    expect(amount).toBe(20);
  });

  it('uses the suggested weekly amount when remaining allows it', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 200,
      plannedContributors: 2,
      userContributed: 0,
      totalContributed: 0,
      deadline: '2026-10-25',
      now: new Date(2026, 7, 30, 12),
      frequency: 'weekly'
    });
    expect(amount).toBe(12.5);
  });

  it('reduces the final payment to remaining personal share', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 200,
      plannedContributors: 2,
      userContributed: 90,
      totalContributed: 90,
      deadline: '2026-09-05',
      now: new Date(2026, 7, 30, 12),
      frequency: 'weekly'
    });
    expect(amount).toBe(10);
  });

  it('caps the automatic amount at overall remaining target', () => {
    const amount = scheduledAutomaticAmount({
      targetAmount: 200,
      plannedContributors: 2,
      userContributed: 0,
      totalContributed: 195,
      deadline: '2026-10-25',
      now: new Date(2026, 7, 30, 12),
      frequency: 'weekly'
    });
    expect(amount).toBe(5);
  });

  it('never returns a negative remaining personal amount', () => {
    expect(remainingPersonalAmount(100, 125)).toBe(0);
    expect(plannedPersonalShare(200, 2)).toBe(100);
  });
});
