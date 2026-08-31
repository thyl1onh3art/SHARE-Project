import {
  tripCountdownLabel,
  tripMoneyPrimaryAction,
  tripGroupMembers,
  tripMoneyParticipantCount,
  equalShareAmount,
  personalRemaining,
  canPaySinglePayment,
  singlePaymentAmount,
  contributionProgressTotal,
  contributionExceedsPersonalShare,
  paymentApprovalProgress,
  paymentRequestStatusLabel,
  parsePaymentDetails,
  canActOnPendingPayment,
  remainingOtherApprovals,
  waitingForMoreApprovalsLabel,
  personRecordId,
  paymentApprovalNotificationCopy,
  resolveLedgerTraveller,
  travellerDisplayName,
  customerFacingPersonName,
  formatHistoryWhen,
  buildSharedAccountHistory,
  formatMoneyAmount,
  sortClosedNewestFirst,
  visibleClosedAccounts,
  calendarDateKey,
  startOfLocalCalendarDay,
  startOfLocalCalendarDayIso,
  parsePlannedContributors,
  plannedContributorsForAccount,
  plannedPersonalShare,
  remainingPersonalAmount,
  calendarDaysRemaining,
  buildPersonalSavingsPlan,
  recurringAmountForFrequency,
  firstDueDate,
  formatPlanDueDate,
  scheduledAutomaticAmount,
  findUserContributionPlan
} from './tripHome';

describe('tripCountdownLabel', () => {
  it('shows days to go for a future trip date', () => {
    expect(tripCountdownLabel('2027-01-01', '10:00', new Date(2026, 10, 20, 12, 0, 0)))
      .toBe('42 days to go');
  });

  it('shows Today when the trip is today', () => {
    expect(tripCountdownLabel('2026-08-22', '18:00', new Date(2026, 7, 22, 9, 0, 0)))
      .toBe('Today');
  });

  it('shows Completed after the date has passed', () => {
    expect(tripCountdownLabel('2026-08-01', '10:00', new Date(2026, 7, 22, 12, 0, 0)))
      .toBe('Completed');
  });

  it('ignores stored time-of-day when counting calendar days', () => {
    const morning = new Date(2026, 8, 10, 0, 30, 0);
    const evening = new Date(2026, 8, 10, 23, 30, 0);
    expect(tripCountdownLabel('2026-09-10', '23:59', morning)).toBe('Today');
    expect(tripCountdownLabel('2026-09-10', '00:01', evening)).toBe('Today');
  });

  it('does not render a negative countdown for past dates', () => {
    expect(tripCountdownLabel('2026-09-09', '23:00', new Date(2026, 8, 10, 1, 0, 0)))
      .toBe('Completed');
    expect(tripCountdownLabel('2026-01-01', undefined, new Date(2026, 8, 10, 12, 0, 0)))
      .not.toMatch(/-/);
  });
});

describe('calendar date helpers', () => {
  it('keeps a selected YYYY-MM-DD date without a UTC day shift', () => {
    expect(calendarDateKey('2026-09-10')).toBe('2026-09-10');
    expect(calendarDateKey(startOfLocalCalendarDayIso('2026-09-10'))).toBe('2026-09-10');
    expect(startOfLocalCalendarDay('2026-09-10')?.getFullYear()).toBe(2026);
    expect(startOfLocalCalendarDay('2026-09-10')?.getMonth()).toBe(8);
    expect(startOfLocalCalendarDay('2026-09-10')?.getDate()).toBe(10);
  });

  it('renders existing stored datetimes as the local calendar day', () => {
    const storedLocalAfternoon = new Date(2026, 8, 10, 15, 45, 0);
    expect(calendarDateKey(storedLocalAfternoon.toISOString())).toBe('2026-09-10');
    expect(tripCountdownLabel(storedLocalAfternoon.toISOString(), '15:45', new Date(2026, 8, 10, 8, 0, 0)))
      .toBe('Today');
  });
});

describe('planned contributors and personal savings plan', () => {
  it('rejects zero, negative, and non-whole planned counts', () => {
    expect(parsePlannedContributors(0)).toEqual({ error: expect.stringMatching(/at least 1/i) });
    expect(parsePlannedContributors(-1)).toEqual({ error: expect.stringMatching(/whole number/i) });
    expect(parsePlannedContributors(2.5)).toEqual({ error: expect.stringMatching(/whole number/i) });
    expect(parsePlannedContributors('')).toEqual({ error: expect.stringMatching(/required/i) });
    expect(parsePlannedContributors(4)).toEqual({ value: 4 });
  });

  it('uses £1,200 / 4 as a £300 planned personal share', () => {
    expect(plannedPersonalShare(1200, 4)).toBe(300);
  });

  it('keeps current-member fair share separate from planned personal share', () => {
    const accepted = tripMoneyParticipantCount({ _id: 'owner-1' }, [{ _id: 'member-1' }]);
    expect(accepted).toBe(2);
    expect(equalShareAmount(1200, accepted)).toBe(600);
    expect(plannedPersonalShare(1200, 4)).toBe(300);
  });

  it('reduces remaining personal amount by contributions and never goes negative', () => {
    expect(remainingPersonalAmount(300, 100)).toBe(200);
    expect(remainingPersonalAmount(300, 300)).toBe(0);
    expect(remainingPersonalAmount(300, 400)).toBe(0);
  });

  it('falls back to owner plus accepted members when historical pots have no planned count', () => {
    expect(plannedContributorsForAccount({
      owner: { _id: 'owner-1' },
      members: [{ _id: 'member-1' }, { _id: 'member-1' }]
    })).toBe(2);
  });

  it('calculates weekly, fortnightly, and monthly amounts without undershooting', () => {
    const now = new Date(2026, 8, 1);
    const deadline = '2026-11-10';
    expect(calendarDaysRemaining(deadline, now)).toBe(70);

    const plan = buildPersonalSavingsPlan({
      id: 'acc-1',
      name: 'Holiday Fund',
      targetAmount: 1200,
      deadline,
      plannedContributors: 4,
      contributed: 100,
      now
    });

    expect(plan).not.toBeNull();
    expect(plan?.plannedShare).toBe(300);
    expect(plan?.contributed).toBe(100);
    expect(plan?.remaining).toBe(200);
    expect(plan?.weekly).toBe(20);
    expect(plan?.fortnightly).toBe(40);
    expect(plan?.monthly).toBe(66.67);
    expect((plan?.weekly ?? 0) * 10).toBeGreaterThanOrEqual(200);
    expect((plan?.fortnightly ?? 0) * 5).toBeGreaterThanOrEqual(200);
    expect((plan?.monthly ?? 0) * 3).toBeGreaterThanOrEqual(200);
  });

  it('treats a same-day deadline as needed today rather than cadence amounts', () => {
    const now = new Date(2026, 11, 10, 15, 0, 0);
    const plan = buildPersonalSavingsPlan({
      id: 'acc-1',
      name: 'Holiday Fund',
      targetAmount: 1200,
      deadline: '2026-12-10',
      plannedContributors: 4,
      contributed: 100,
      now
    });

    expect(plan?.deadlineState).toBe('today');
    expect(calendarDaysRemaining('2026-12-10', now)).toBe(0);
    expect(plan?.weekly).toBeNull();
    expect(plan?.fortnightly).toBeNull();
    expect(plan?.monthly).toBeNull();
    expect(plan?.remaining).toBe(200);
  });

  it('marks a past deadline without negative periods', () => {
    const now = new Date(2026, 11, 11);
    const plan = buildPersonalSavingsPlan({
      id: 'acc-1',
      name: 'Holiday Fund',
      targetAmount: 1200,
      deadline: '2026-12-10',
      plannedContributors: 4,
      contributed: 100,
      now
    });

    expect(plan?.deadlineState).toBe('past');
    expect(calendarDaysRemaining('2026-12-10', now)).toBe(-1);
    expect(plan?.weekly).toBeNull();
    expect(plan?.fortnightly).toBeNull();
    expect(plan?.monthly).toBeNull();
  });

  it('does not shift a date-only deadline by one calendar day', () => {
    expect(calendarDateKey('2026-12-10')).toBe('2026-12-10');
    expect(calendarDaysRemaining('2026-12-10', new Date(2026, 11, 10, 23, 0, 0))).toBe(0);
    expect(calendarDaysRemaining('2026-12-10', new Date(2026, 11, 9, 1, 0, 0))).toBe(1);
  });

  it('shows a covered plan when the personal share is already met', () => {
    const plan = buildPersonalSavingsPlan({
      id: 'acc-1',
      name: 'Holiday Fund',
      targetAmount: 1200,
      deadline: '2026-12-10',
      plannedContributors: 4,
      contributed: 300,
      now: new Date(2026, 8, 1)
    });

    expect(plan?.covered).toBe(true);
    expect(plan?.remaining).toBe(0);
    expect(plan?.weekly).toBeNull();
    expect(plan?.fortnightly).toBeNull();
    expect(plan?.monthly).toBeNull();
  });

  it('calculates a weekly recurring amount for £100 over 8 weeks without undershooting', () => {
    const now = new Date(2026, 8, 1);
    const deadline = '2026-10-27';
    expect(calendarDaysRemaining(deadline, now)).toBe(56);
    expect(plannedPersonalShare(200, 2)).toBe(100);
    expect(recurringAmountForFrequency(100, 56, 'weekly', 'future')).toBe(12.5);
    expect(recurringAmountForFrequency(100, 56, 'fortnightly', 'future')).toBe(25);
    expect(recurringAmountForFrequency(100, 56, 'monthly', 'future')).toBe(50);
    expect((12.5) * 8).toBeGreaterThanOrEqual(100);
  });

  it('sets first due dates with date-only weekly, fortnightly, and monthly cadence', () => {
    expect(firstDueDate('weekly', '2026-08-23')).toBe('2026-08-30');
    expect(firstDueDate('fortnightly', '2026-08-16')).toBe('2026-08-30');
    expect(firstDueDate('monthly', '2026-07-30')).toBe('2026-08-30');
    expect(firstDueDate('monthly', '2026-01-31')).toBe('2026-02-28');
    expect(formatPlanDueDate('2026-09-06')).toBe('6 September 2026');
  });

  it('caps the next automatic amount by remaining personal share and overall target', () => {
    expect(scheduledAutomaticAmount({
      remainingPersonal: 100,
      overallRemaining: 200,
      daysRemaining: 56,
      deadlineState: 'future',
      frequency: 'weekly'
    })).toBe(12.5);
    expect(scheduledAutomaticAmount({
      remainingPersonal: 10,
      overallRemaining: 200,
      daysRemaining: 6,
      deadlineState: 'future',
      frequency: 'weekly'
    })).toBe(10);
    expect(scheduledAutomaticAmount({
      remainingPersonal: 100,
      overallRemaining: 5,
      daysRemaining: 56,
      deadlineState: 'future',
      frequency: 'weekly'
    })).toBe(5);
  });

  it('keeps a persisted £25 weekly instalment instead of recasting from remaining days', () => {
    expect(recurringAmountForFrequency(100, 28, 'weekly', 'future')).toBe(25);
    expect(scheduledAutomaticAmount({
      remainingPersonal: 75,
      overallRemaining: 75,
      daysRemaining: 28,
      deadlineState: 'future',
      frequency: 'weekly',
      scheduledAmount: 25
    })).toBe(25);
    const plan = buildPersonalSavingsPlan({
      id: 'acc-1',
      name: 'Savings Test',
      targetAmount: 100,
      plannedContributors: 1,
      contributed: 25,
      recordedTotal: 25,
      deadline: '2026-09-28',
      now: new Date(2026, 7, 31),
      userPlan: {
        frequency: 'weekly',
        agreed: true,
        status: 'active',
        scheduledAmount: 25,
        nextContributionDate: '2026-09-14'
      }
    });
    expect(plan?.nextAutomaticAmount).toBe(25);
    expect(plan?.contributed).toBe(25);
    expect(plan?.remaining).toBe(75);
  });

  it('does not treat a historical account as an agreed plan', () => {
    expect(findUserContributionPlan(undefined, 'user-1')).toBeNull();
    expect(findUserContributionPlan([], 'user-1')).toBeNull();
    expect(findUserContributionPlan([
      { user: 'user-2', frequency: 'weekly', agreed: true }
    ], 'user-1')).toBeNull();
    expect(findUserContributionPlan([
      { user: 'user-1', frequency: 'monthly', agreed: true }
    ], 'user-1')).toEqual(expect.objectContaining({
      frequency: 'monthly',
      agreed: true,
      agreedAt: null,
      user: 'user-1'
    }));
  });
});

describe('tripMoneyPrimaryAction', () => {
  it('offers Set up Trip Money when no pot is linked', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', null);
    expect(action.label).toBe('Set up Shared Account');
    expect(action.to).toContain('/shared-accounts?event=trip-1');
    expect(action.to).toContain('name=Canada');
  });

  it('offers Open Trip Money while the target is still open', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', {
      _id: 'pot-1',
      name: 'Canada costs',
      isDeleted: false,
      targetAmount: 2400,
      recordedTotal: 1800
    });
    expect(action.label).toBe('Open Shared Account');
    expect(action.to).toBe('/shared-accounts/pot-1');
  });

  it('offers Review Trip Money when the target is reached', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', {
      _id: 'pot-1',
      name: 'Canada costs',
      targetAmount: 2400,
      recordedTotal: 2400
    });
    expect(action.label).toBe('Review Shared Account');
  });

  it('offers View closed Trip Money for an archived pot', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', {
      _id: 'pot-1',
      name: 'Canada costs',
      isDeleted: true,
      targetAmount: 2400,
      recordedTotal: 2400
    });
    expect(action.label).toBe('View closed Shared Account');
    expect(action.to).toBe('/shared-accounts/pot-1');
  });
});

describe('equal share and remaining', () => {
  it('splits the target across owner plus members', () => {
    expect(tripMoneyParticipantCount(
      { _id: 'u1', firstName: 'Sam' },
      [{ _id: 'u2', firstName: 'Alex' }, { _id: 'u3', firstName: 'Jo' }]
    )).toBe(3);
    expect(equalShareAmount(2400, 4)).toBe(600);
    expect(personalRemaining(600, 250)).toBe(350);
  });

  it('does not invent a remaining amount without a target or travellers', () => {
    expect(equalShareAmount(0, 4)).toBeNull();
    expect(equalShareAmount(2400, 0)).toBeNull();
    expect(personalRemaining(null, 250)).toBeNull();
  });

  it('does not show a negative remaining after the share is reached', () => {
    expect(personalRemaining(600, 600)).toBe(0);
    expect(personalRemaining(600, 800)).toBe(0);
  });
});

describe('pay single payment gating', () => {
  it('is unavailable below target, with no target, or when archived', () => {
    expect(canPaySinglePayment(900, 1000)).toBe(false);
    expect(canPaySinglePayment(1000, 0)).toBe(false);
    expect(canPaySinglePayment(1000, null)).toBe(false);
    expect(canPaySinglePayment(1000, 1000, true)).toBe(false);
  });

  it('is available at or above target and always uses the full target amount', () => {
    expect(canPaySinglePayment(1000, 1000)).toBe(true);
    expect(canPaySinglePayment(1100, 1000)).toBe(true);
    expect(singlePaymentAmount(2000)).toBe(2000);
    expect(singlePaymentAmount(1999.999)).toBe(2000);
    expect(singlePaymentAmount(0)).toBeNull();
  });
});

describe('contribution progress vs completed payment', () => {
  it('does not let a matching executed payment output reduce funding progress', () => {
    expect(contributionProgressTotal(
      [
        { type: 'input', amount: 2000 },
        { type: 'output', amount: 2000, description: 'Payee: Hotel · Ref: ABC' }
      ],
      [{ status: 'executed', amount: 2000, description: 'Payee: Hotel · Ref: ABC' }]
    )).toBe(2000);
  });

  it('still subtracts a contribution reversal', () => {
    expect(contributionProgressTotal(
      [
        { type: 'input', amount: 2000 },
        { type: 'output', amount: 100, description: 'Reverse recorded contribution' }
      ],
      []
    )).toBe(1900);
  });
});

describe('payment request display helpers', () => {
  it('parses payee and reference from the stored description', () => {
    expect(parsePaymentDetails('Payee: Example Hotel · Ref: ABC123')).toEqual({
      payee: 'Example Hotel',
      reference: 'ABC123',
      raw: 'Payee: Example Hotel · Ref: ABC123'
    });
  });

  it('uses customer-facing payment status labels', () => {
    expect(paymentRequestStatusLabel('pending')).toBe('Waiting for approval');
    expect(paymentRequestStatusLabel('executed')).toBe('Payment completed');
    expect(paymentRequestStatusLabel('approved')).toBe('Payment completed');
    expect(paymentRequestStatusLabel('rejected')).toBe('Payment rejected');
    expect(paymentRequestStatusLabel('cancelled')).toBe('Payment request cancelled');
  });

  it('counts the proposer in the displayed approval progress', () => {
    expect(paymentApprovalProgress({ approvals: [], requiredApprovals: 2 })).toEqual({
      current: 1,
      total: 3
    });
    expect(paymentApprovalProgress({ approvals: [{}], requiredApprovals: 2 })).toEqual({
      current: 2,
      total: 3
    });
  });

  it('lets only other accepted members act on a pending payment', () => {
    const pending = {
      status: 'pending',
      requestedBy: { _id: 'user-1', firstName: 'richard', lastName: 'brown' },
      approvals: [],
      rejections: [],
      requiredApprovals: 1
    };
    expect(canActOnPendingPayment(pending, 'user-1')).toBe(false);
    expect(canActOnPendingPayment(pending, 'user-2')).toBe(true);
    expect(canActOnPendingPayment(pending, 'user-2', true)).toBe(false);
    expect(canActOnPendingPayment({ ...pending, status: 'executed' }, 'user-2')).toBe(false);
    expect(canActOnPendingPayment({ ...pending, status: 'rejected' }, 'user-2')).toBe(false);
    expect(canActOnPendingPayment({ ...pending, status: 'cancelled' }, 'user-2')).toBe(false);
    expect(canActOnPendingPayment({
      ...pending,
      approvals: [{ user: 'user-2' }]
    }, 'user-2')).toBe(false);
    expect(remainingOtherApprovals(pending)).toBe(1);
    expect(waitingForMoreApprovalsLabel(pending)).toBe('Waiting for 1 more approval');
    expect(personRecordId({ id: 'user-2' })).toBe('user-2');
    expect(personRecordId({ _id: 'user-1' })).toBe('user-1');
  });

  it('builds a payment-approval notification that uses real names and the Shared Account route', () => {
    const copy = paymentApprovalNotificationCopy({
      amount: 1000,
      requestedBy: { _id: 'user-1', firstName: 'richard', lastName: 'brown' },
      sharedAccount: { _id: 'acc-3', name: 'test 3' }
    });
    expect(copy.title).toBe('Payment approval needed');
    expect(copy.body).toBe('richard brown wants to pay £1000.00 from “test 3”. Review and approve the payment.');
    expect(copy.to).toBe('/shared-accounts/acc-3');
    expect(copy.body).not.toMatch(/unknown user/i);
    expect(copy.body).not.toMatch(/[a-f0-9]{24}/i);
  });
});

describe('ledger traveller display', () => {
  it('uses a populated finance user', () => {
    expect(travellerDisplayName(resolveLedgerTraveller(
      { _id: 'u2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
      { _id: 'u1', firstName: 'Sam' },
      []
    ))).toBe('Alex Friend');
  });

  it('falls back to pot membership or email when the user is only an id', () => {
    expect(travellerDisplayName(resolveLedgerTraveller(
      'u2',
      { _id: 'u1', firstName: 'Sam', lastName: 'Organiser' },
      [{ _id: 'u2', firstName: '', lastName: '', email: 'test222@example.com' }]
    ))).toBe('test222@example.com');
  });

  it('does not display Member or an ObjectId when identity is missing', () => {
    expect(travellerDisplayName(resolveLedgerTraveller(
      '507f1f77bcf86cd799439011',
      { _id: 'u1', firstName: 'Sam', lastName: 'Brown' },
      []
    ))).toBe('Account activity');
  });
});

describe('tripGroupMembers', () => {
  it('lists the organiser and other travellers without duplicates', () => {
    const members = tripGroupMembers({
      title: 'Canada',
      eventDate: '2027-01-01',
      eventTime: '10:00',
      user: { _id: 'u1', firstName: 'Sam', lastName: 'Organiser' },
      sharedWith: [{ _id: 'u2', firstName: 'Alex', lastName: 'Friend' }],
      tripMoney: {
        _id: 'pot-1',
        name: 'Canada',
        owner: { _id: 'u1', firstName: 'Sam', lastName: 'Organiser' },
        members: [{ _id: 'u2', firstName: 'Alex', lastName: 'Friend' }]
      }
    });

    expect(members).toEqual([
      { id: 'u1', name: 'Sam', isOrganiser: true },
      { id: 'u2', name: 'Alex', isOrganiser: false }
    ]);
  });
});

describe('personal share confirmation helper', () => {
  it('does not warn at or below remaining share', () => {
    expect(contributionExceedsPersonalShare(50, 50)).toBe(false);
    expect(contributionExceedsPersonalShare(49.99, 50)).toBe(false);
    expect(contributionExceedsPersonalShare(10, null)).toBe(false);
  });

  it('warns when the amount is above remaining share', () => {
    expect(contributionExceedsPersonalShare(50.01, 50)).toBe(true);
    expect(contributionExceedsPersonalShare(25, 0)).toBe(true);
  });
});

describe('transaction history helpers', () => {
  const owner = { _id: 'u1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' };
  const member = { _id: 'u2', firstName: 'Richard', lastName: 'Brown', email: 'richard@example.com' };

  it('formats a readable local date and time instead of ISO', () => {
    const formatted = formatHistoryWhen('2026-08-27T13:10:00.000Z');
    expect(formatted).toMatch(/^\d{1,2} \w{3} \d{4} · \d{2}:\d{2}$/);
    expect(formatted).not.toMatch(/T\d{2}:/);
    expect(formatted).not.toContain('Z');
  });

  it('uses Account activity instead of an ObjectId', () => {
    expect(customerFacingPersonName('507f1f77bcf86cd799439011', owner, [member])).toBe('Account activity');
  });

  it('builds one chronological history with customer wording', () => {
    const history = buildSharedAccountHistory(
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 50,
          date: '2026-08-27T13:10:00.000Z',
          user: owner
        },
        {
          _id: 'r2',
          type: 'input',
          amount: 150,
          date: '2026-08-27T13:22:00.000Z',
          user: member
        },
        {
          _id: 'r-out',
          type: 'output',
          amount: 200,
          date: '2026-08-27T13:35:00.000Z',
          description: 'Payee: Test Hotel · Ref: ABC',
          user: owner
        }
      ],
      [{
        _id: 'pr-1',
        status: 'executed',
        amount: 200,
        description: 'Payee: Test Hotel · Ref: ABC',
        createdAt: '2026-08-27T13:25:00.000Z',
        updatedAt: '2026-08-27T13:35:00.000Z',
        requestedBy: owner,
        approvals: [{ user: owner, timestamp: '2026-08-27T13:30:00.000Z' }]
      }],
      owner,
      [member]
    );

    expect(history.map((entry) => entry.action)).toEqual([
      'Contributed £50.00',
      'Contributed £150.00',
      'Proposed final payment of £200.00 to Test Hotel',
      'Approved final payment',
      '£200.00 to Test Hotel'
    ]);
    expect(history.filter((entry) => entry.action.startsWith('Contributed £50.00'))).toHaveLength(1);
    expect(history.some((entry) => /FinanceRecord|PaymentRequest|ledger|input|output|executed|settlement/i.test(`${entry.person} ${entry.action}`))).toBe(false);
    expect(history[history.length - 1].person).toBe('Final payment');
    expect(formatMoneyAmount(50)).toBe('£50.00');
  });

  it('labels automatic simulated contributions separately from manual ones', () => {
    const history = buildSharedAccountHistory(
      [
        {
          _id: 'r-manual',
          type: 'input',
          amount: 20,
          date: '2026-08-30T14:10:00.000Z',
          user: owner
        },
        {
          _id: 'r-auto',
          type: 'input',
          amount: 12.5,
          date: '2026-08-30T09:00:00.000Z',
          source: 'automatic',
          user: owner
        }
      ],
      [],
      owner,
      [member]
    );
    expect(history.map((entry) => entry.action)).toEqual([
      'Automatic contribution £12.50',
      'Contributed £20.00'
    ]);
    expect(history.every((entry) => entry.person === 'Sam Brown')).toBe(true);
    expect(history.some((entry) => /Direct Debit/i.test(entry.action))).toBe(false);
  });

  it('uses simple wording for rejection and cancellation', () => {
    const rejected = buildSharedAccountHistory([], [{
      _id: 'pr-rej',
      status: 'rejected',
      amount: 100,
      description: 'Payee: Cafe · Ref: 1',
      createdAt: '2026-08-27T10:00:00.000Z',
      requestedBy: owner,
      rejections: [{ user: member, timestamp: '2026-08-27T10:05:00.000Z' }]
    }], owner, [member]);
    expect(rejected.some((entry) => entry.action === 'Rejected final payment')).toBe(true);

    const cancelled = buildSharedAccountHistory([], [{
      _id: 'pr-can',
      status: 'cancelled',
      amount: 100,
      createdAt: '2026-08-27T10:00:00.000Z',
      updatedAt: '2026-08-27T10:08:00.000Z',
      requestedBy: owner
    }], owner, [member]);
    expect(cancelled.some((entry) => entry.action === 'Cancelled final payment')).toBe(true);
  });
});

describe('closed account dashboard helpers', () => {
  it('sorts closed accounts by deletedAt newest first and slices the preview', () => {
    const sorted = sortClosedNewestFirst([
      { _id: 'old', deletedAt: '2026-01-01T00:00:00.000Z' },
      { _id: 'newest', deletedAt: '2026-08-27T12:00:00.000Z' },
      { _id: 'mid', deletedAt: '2026-06-01T00:00:00.000Z' }
    ]);
    expect(sorted.map((account) => account._id)).toEqual(['newest', 'mid', 'old']);
    expect(visibleClosedAccounts(sorted, false).map((account) => account._id)).toEqual(['newest']);
    expect(visibleClosedAccounts(sorted, true).map((account) => account._id)).toEqual(['newest', 'mid', 'old']);
  });
});
