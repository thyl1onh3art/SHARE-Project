import {
  tripCountdownLabel,
  tripMoneyPrimaryAction,
  tripGroupMembers
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

  it('shows Trip completed after the trip date', () => {
    expect(tripCountdownLabel('2026-08-01', '10:00', new Date('2026-08-22T12:00:00')))
      .toBe('Trip completed');
  });
});

describe('tripMoneyPrimaryAction', () => {
  it('offers Set up Trip Money when no pot is linked', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', null);
    expect(action.label).toBe('Set up Trip Money');
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
    expect(action.label).toBe('Open Trip Money');
    expect(action.to).toBe('/shared-accounts/pot-1');
  });

  it('offers Review Trip Money when the target is reached', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', {
      _id: 'pot-1',
      name: 'Canada costs',
      targetAmount: 2400,
      recordedTotal: 2400
    });
    expect(action.label).toBe('Review Trip Money');
  });

  it('offers View closed Trip Money for an archived pot', () => {
    const action = tripMoneyPrimaryAction('trip-1', 'Canada', {
      _id: 'pot-1',
      name: 'Canada costs',
      isDeleted: true,
      targetAmount: 2400,
      recordedTotal: 2400
    });
    expect(action.label).toBe('View closed Trip Money');
    expect(action.to).toBe('/shared-accounts/pot-1');
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
