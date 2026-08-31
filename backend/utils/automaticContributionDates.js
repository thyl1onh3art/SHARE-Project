const CALENDAR_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatLocalYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local calendar YYYY-MM-DD. Bare date strings are kept as-is (no UTC midnight parse). */
function calendarDateKey(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatLocalYmd(value);
  }
  const trimmed = String(value).trim();
  if (CALENDAR_YMD.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    const prefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    return prefix ? prefix[1] : null;
  }
  return formatLocalYmd(parsed);
}

function startOfLocalCalendarDay(value) {
  const key = calendarDateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function addCalendarDays(ymd, days) {
  const start = startOfLocalCalendarDay(ymd);
  if (!start) return null;
  start.setDate(start.getDate() + days);
  return formatLocalYmd(start);
}

function addCalendarMonths(ymd, months) {
  const start = startOfLocalCalendarDay(ymd);
  if (!start) return null;
  const day = start.getDate();
  start.setDate(1);
  start.setMonth(start.getMonth() + months);
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  start.setDate(Math.min(day, lastDay));
  return formatLocalYmd(start);
}

/**
 * First due date after an agreement/start/resume/frequency-change date.
 * Weekly: +7 local calendar days.
 * Every 2 weeks: +14 local calendar days.
 * Monthly: same calendar day next month, clamped to the last valid day.
 */
function firstDueDate(frequency, startYmd) {
  const start = calendarDateKey(startYmd);
  if (!start) return null;
  if (frequency === 'weekly') return addCalendarDays(start, 7);
  if (frequency === 'fortnightly') return addCalendarDays(start, 14);
  if (frequency === 'monthly') return addCalendarMonths(start, 1);
  return null;
}

function advanceDueDate(frequency, fromYmd) {
  return firstDueDate(frequency, fromYmd);
}

function isDueOnOrBefore(nextYmd, todayYmd) {
  const next = calendarDateKey(nextYmd);
  const today = calendarDateKey(todayYmd);
  return !!(next && today && next <= today);
}

function calendarDaysRemaining(deadline, now) {
  const end = startOfLocalCalendarDay(deadline);
  if (!end) return null;
  const todayValue = startOfLocalCalendarDay(now) || new Date();
  const today = new Date(todayValue.getFullYear(), todayValue.getMonth(), todayValue.getDate());
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function deadlineStateFromDays(days) {
  if (days === null || days === undefined) return null;
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  return 'future';
}

function processorKey(sharedAccountId, userId, scheduledFor) {
  return `${String(sharedAccountId)}:${String(userId)}:${calendarDateKey(scheduledFor)}`;
}

module.exports = {
  formatLocalYmd,
  calendarDateKey,
  startOfLocalCalendarDay,
  addCalendarDays,
  addCalendarMonths,
  firstDueDate,
  advanceDueDate,
  isDueOnOrBefore,
  calendarDaysRemaining,
  deadlineStateFromDays,
  processorKey
};
