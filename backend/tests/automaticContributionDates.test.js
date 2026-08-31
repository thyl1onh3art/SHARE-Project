const {
  calendarDateKey,
  firstDueDate,
  advanceDueDate,
  isDueOnOrBefore,
  addCalendarMonths,
  processorKey
} = require('../utils/automaticContributionDates');

describe('automatic contribution calendar dates', () => {
  it('keeps YYYY-MM-DD as a date-only key without UTC shifting', () => {
    expect(calendarDateKey('2026-08-30')).toBe('2026-08-30');
    expect(calendarDateKey('2026-08-30T23:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('sets first weekly due date 7 local days after agreement', () => {
    expect(firstDueDate('weekly', '2026-08-23')).toBe('2026-08-30');
  });

  it('sets first fortnightly due date 14 local days after agreement', () => {
    expect(firstDueDate('fortnightly', '2026-08-16')).toBe('2026-08-30');
  });

  it('sets first monthly due date to the same calendar day next month', () => {
    expect(firstDueDate('monthly', '2026-07-30')).toBe('2026-08-30');
  });

  it('clamps monthly dates to the last valid day of the next month', () => {
    expect(addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(firstDueDate('monthly', '2026-01-31')).toBe('2026-02-28');
  });

  it('advances weekly by 7 days and fortnightly by 14 from the scheduled date', () => {
    expect(advanceDueDate('weekly', '2026-08-30')).toBe('2026-09-06');
    expect(advanceDueDate('fortnightly', '2026-08-30')).toBe('2026-09-13');
  });

  it('treats a plan as due on or before today', () => {
    expect(isDueOnOrBefore('2026-08-30', '2026-08-30')).toBe(true);
    expect(isDueOnOrBefore('2026-08-30', '2026-08-29')).toBe(false);
  });

  it('builds a durable processor key from account, user, and scheduled date', () => {
    expect(processorKey('acc1', 'user1', '2026-08-30')).toBe('acc1:user1:2026-08-30');
  });
});
