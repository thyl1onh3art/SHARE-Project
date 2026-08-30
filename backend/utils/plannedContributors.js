const MAX_PLANNED_CONTRIBUTORS = 50;

function parsePlannedContributors(value) {
  if (value === undefined || value === null || value === '') {
    return { error: 'How many people will contribute is required' };
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    return { error: 'Enter a whole number of people' };
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    return { error: 'Enter a whole number of people' };
  }
  if (parsed < 1) {
    return { error: 'At least 1 person must contribute' };
  }
  if (parsed > MAX_PLANNED_CONTRIBUTORS) {
    return { error: `Enter at most ${MAX_PLANNED_CONTRIBUTORS} people` };
  }
  return { value: parsed };
}

module.exports = {
  MAX_PLANNED_CONTRIBUTORS,
  parsePlannedContributors
};
