import {
  formatPersonalBalanceGbp,
  personalBalanceFromRecords
} from './personalBalance';

describe('personalBalanceFromRecords', () => {
  it('returns 0 when there are no records', () => {
    expect(personalBalanceFromRecords([])).toBe(0);
    expect(personalBalanceFromRecords(undefined)).toBe(0);
  });

  it('calculates personal inputs minus outputs', () => {
    expect(personalBalanceFromRecords([
      { type: 'input', amount: 400 },
      { type: 'output', amount: 50 }
    ])).toBe(350);
  });

  it('excludes Trip Money rows and permanently deleted Trip Money history', () => {
    expect(personalBalanceFromRecords([
      { type: 'input', amount: 100 },
      { type: 'input', amount: 80, sharedAccount: 'pot-1' },
      { type: 'input', amount: 25, archivedAccountName: 'Old pot' }
    ])).toBe(100);
  });
});

describe('formatPersonalBalanceGbp', () => {
  it('shows pounds and pence including £0.00', () => {
    expect(formatPersonalBalanceGbp(0)).toBe('£0.00');
    expect(formatPersonalBalanceGbp(350)).toBe('£350.00');
    expect(formatPersonalBalanceGbp(12.5)).toBe('£12.50');
  });
});
