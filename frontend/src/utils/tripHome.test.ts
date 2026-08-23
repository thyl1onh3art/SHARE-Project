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
  paymentApprovalProgress,
  paymentRequestStatusLabel,
  parsePaymentDetails,
  resolveLedgerTraveller,
  travellerDisplayName
} from './tripHome';

describe('tripCountdownLabel', () => {
  it('shows days to go for a future trip date', () => {
    expect(tripCountdownLabel('2027-01-01', '10:00', new Date('2026-11-20T12:00:00')))
      .toBe('42 days to go');
  });

  it('shows Today when the trip is today', () => {
    expect(tripCountdownLabel('2026-08-22', '18:00', new Date('2026-08-22T09:00:00')))
      .toBe('Today');
  });

  it('shows Completed after the date has passed', () => {
    expect(tripCountdownLabel('2026-08-01', '10:00', new Date('2026-08-22T12:00:00')))
      .toBe('Completed');
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
