export interface PersonSummary {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface TripMoneySummary {
  _id: string;
  name: string;
  isDeleted?: boolean;
  targetAmount?: number | null;
  targetDate?: string | null;
  plannedContributors?: number | null;
  recordedTotal?: number;
  yourContribution?: number;
  owner?: PersonSummary | null;
  members?: PersonSummary[];
}

export interface TripHomeEvent {
  _id?: string;
  title: string;
  description?: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  user?: PersonSummary | string;
  sharedWith?: Array<PersonSummary | string>;
  tripMoney?: TripMoneySummary | null;
}

export interface TripPrimaryAction {
  label: string;
  to: string;
}

export interface TripGroupMember {
  id: string;
  name: string;
  isOrganiser: boolean;
}

const CALENDAR_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local calendar YYYY-MM-DD. Bare date strings are kept as-is (no UTC midnight parse). */
export function calendarDateKey(value?: string | Date | null): string | null {
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

export function startOfLocalCalendarDay(value?: string | Date | null): Date | null {
  const key = calendarDateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function startOfLocalCalendarDayIso(value?: string | Date | null): string | null {
  const local = startOfLocalCalendarDay(value);
  return local ? local.toISOString() : null;
}

export function tripCountdownLabel(
  eventDate: string,
  _eventTime?: string,
  now: Date = new Date()
): string {
  const startDay = startOfLocalCalendarDay(eventDate);
  if (!startDay) return '';

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((startDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return 'Today';
  if (dayDiff < 0) return 'Completed';
  if (dayDiff === 1) return '1 day to go';
  return `${dayDiff} days to go`;
}

export function formatGbp(amount: number): string {
  const value = Number(amount) || 0;
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatContributionDeadline(targetDate?: string | null): string | null {
  const startDay = startOfLocalCalendarDay(targetDate);
  if (!startDay) return null;
  return startDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export function tripMoneyPrimaryAction(
  tripId: string,
  tripTitle: string,
  tripMoney?: TripMoneySummary | null
): TripPrimaryAction {
  if (!tripMoney?._id) {
    return {
      label: 'Set up Shared Account',
      to: `/shared-accounts?event=${encodeURIComponent(tripId)}&name=${encodeURIComponent(tripTitle)}`
    };
  }

  const potPath = `/shared-accounts/${tripMoney._id}`;
  if (tripMoney.isDeleted) {
    return { label: 'View closed Shared Account', to: potPath };
  }

  const target = Number(tripMoney.targetAmount) || 0;
  const recorded = Number(tripMoney.recordedTotal) || 0;
  if (target > 0 && recorded >= target) {
    return { label: 'Review Shared Account', to: potPath };
  }

  return { label: 'Open Shared Account', to: potPath };
}

export function tripMoneyParticipantCount(
  owner?: PersonSummary | string | null,
  members?: Array<PersonSummary | string> | null
): number {
  const ids = new Set<string>();
  const add = (person: PersonSummary | string | null | undefined) => {
    if (!person) return;
    const id = String(typeof person === 'string' ? person : person._id);
    if (id && id !== 'undefined') {
      ids.add(id);
    }
  };
  add(owner);
  (members || []).forEach(add);
  return ids.size;
}

export function equalShareAmount(targetAmount: number, participantCount: number): number | null {
  if (!(Number(targetAmount) > 0) || !(participantCount > 0)) {
    return null;
  }
  return Math.round((Number(targetAmount) / participantCount) * 100) / 100;
}

export function personalRemaining(
  equalShare: number | null,
  yourContribution: number
): number | null {
  if (equalShare === null) {
    return null;
  }
  return Math.max(0, Math.round((equalShare - Math.max(0, Number(yourContribution) || 0)) * 100) / 100);
}

export const MAX_PLANNED_CONTRIBUTORS = 50;

export function parsePlannedContributors(value: unknown): { value: number } | { error: string } {
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

export function plannedContributorsForAccount(account: {
  plannedContributors?: number | null;
  owner?: PersonSummary | string | null;
  members?: Array<PersonSummary | string> | null;
}): number {
  const stored = parsePlannedContributors(account.plannedContributors);
  if ('value' in stored) return stored.value;
  return Math.max(1, tripMoneyParticipantCount(account.owner, account.members));
}

export function plannedPersonalShare(targetAmount: number, plannedContributors: number): number | null {
  return equalShareAmount(targetAmount, plannedContributors);
}

export function remainingPersonalAmount(plannedShare: number | null, contributed: number): number {
  if (plannedShare === null) return 0;
  return Math.max(0, Math.round((plannedShare - Math.max(0, Number(contributed) || 0)) * 100) / 100);
}

export function calendarDaysRemaining(
  deadline?: string | Date | null,
  now: Date = new Date()
): number | null {
  const end = startOfLocalCalendarDay(deadline);
  if (!end) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function amountCoveringPeriods(remainingPence: number, periods: number): number {
  const safePeriods = Math.max(1, periods);
  return Math.ceil(remainingPence / safePeriods) / 100;
}

export type ContributionFrequency = 'weekly' | 'fortnightly' | 'monthly';
export type SavingsDeadlineState = 'future' | 'today' | 'past';

export const CONTRIBUTION_FREQUENCIES: Array<{
  value: ContributionFrequency;
  label: string;
  perLabel: string;
}> = [
  { value: 'weekly', label: 'Weekly', perLabel: 'per week' },
  { value: 'fortnightly', label: 'Every 2 weeks', perLabel: 'every 2 weeks' },
  { value: 'monthly', label: 'Monthly', perLabel: 'per month' }
];

export function parseContributionFrequency(value: unknown): { value: ContributionFrequency } | { error: string } {
  if (value === undefined || value === null || value === '') {
    return { error: 'Choose how often you want to contribute' };
  }
  const raw = String(value).trim();
  if (raw === 'weekly' || raw === 'fortnightly' || raw === 'monthly') {
    return { value: raw };
  }
  return { error: 'Choose Weekly, Every 2 weeks, or Monthly' };
}

export function parseContributionAgreement(value: unknown): { value: true } | { error: string } {
  if (value === true || value === 'true') {
    return { value: true };
  }
  return { error: 'Please agree to this contribution plan' };
}

export function frequencyMeta(frequency: ContributionFrequency) {
  return CONTRIBUTION_FREQUENCIES.find((option) => option.value === frequency)
    || CONTRIBUTION_FREQUENCIES[0];
}

export function deadlineStateFromDays(days: number | null): SavingsDeadlineState | null {
  if (days === null) return null;
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  return 'future';
}

/**
 * Recurring amount for one cadence.
 * weeklyPeriods = max(1, ceil(daysRemaining / 7))
 * fortnightlyPeriods = max(1, ceil(daysRemaining / 14))
 * monthlyPeriods = max(1, ceil(daysRemaining / 30))  // 30-day month approximation
 * amount = ceil(remainingPence / periods) / 100 so displayed totals do not undershoot.
 */
export function recurringAmountForFrequency(
  remaining: number,
  daysRemaining: number | null,
  frequency: ContributionFrequency,
  deadlineState: SavingsDeadlineState | null
): number | null {
  if (!(remaining > 0) || deadlineState !== 'future' || daysRemaining === null || daysRemaining <= 0) {
    return null;
  }
  const remainingPence = Math.round(remaining * 100);
  const daySpan = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : 30;
  return amountCoveringPeriods(remainingPence, Math.ceil(daysRemaining / daySpan));
}

export interface StoredContributionPlan {
  user?: { _id?: string; id?: string } | string | null;
  frequency?: string | null;
  agreed?: boolean | null;
  agreedAt?: string | Date | null;
}

export interface PersonalSavingsPlan {
  id?: string;
  name: string;
  plannedShare: number;
  contributed: number;
  remaining: number;
  covered: boolean;
  deadline: string | null;
  deadlineLabel: string | null;
  deadlineState: SavingsDeadlineState | null;
  weekly: number | null;
  fortnightly: number | null;
  monthly: number | null;
  frequency: ContributionFrequency | null;
  agreed: boolean;
  recurringAmount: number | null;
  recurringPerLabel: string | null;
}

/**
 * Personal contribution plan (prototype schedule, not a bank Direct Debit).
 * plannedPersonalShare = target / plannedContributors
 * remainingPersonalAmount = max(0, plannedShare - contributed)
 * Cadence amounts use ceil(remainingPence / periods) / 100.
 */
export function buildPersonalSavingsPlan(input: {
  id?: string;
  name: string;
  targetAmount?: number | null;
  plannedContributors?: number | null;
  owner?: PersonSummary | string | null;
  members?: Array<PersonSummary | string> | null;
  contributed?: number | null;
  deadline?: string | Date | null;
  now?: Date;
  userPlan?: { frequency?: string | null; agreed?: boolean | null } | null;
}): PersonalSavingsPlan | null {
  const contributors = plannedContributorsForAccount({
    plannedContributors: input.plannedContributors,
    owner: input.owner,
    members: input.members
  });
  const plannedShare = plannedPersonalShare(Number(input.targetAmount) || 0, contributors);
  if (plannedShare === null) return null;

  const contributed = Math.max(0, Number(input.contributed) || 0);
  const remaining = remainingPersonalAmount(plannedShare, contributed);
  const covered = remaining <= 0;
  const now = input.now || new Date();
  const days = calendarDaysRemaining(input.deadline, now);
  const startDay = startOfLocalCalendarDay(input.deadline);
  const deadlineLabel = startDay
    ? startDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const deadlineState = deadlineStateFromDays(days);

  let weekly: number | null = null;
  let fortnightly: number | null = null;
  let monthly: number | null = null;
  if (!covered && deadlineState === 'future' && days !== null) {
    weekly = recurringAmountForFrequency(remaining, days, 'weekly', deadlineState);
    fortnightly = recurringAmountForFrequency(remaining, days, 'fortnightly', deadlineState);
    monthly = recurringAmountForFrequency(remaining, days, 'monthly', deadlineState);
  }

  const parsedFrequency = parseContributionFrequency(input.userPlan?.frequency);
  const frequency = 'value' in parsedFrequency ? parsedFrequency.value : null;
  const agreed = !!(input.userPlan?.agreed && frequency);
  const recurringAmount = frequency
    ? recurringAmountForFrequency(remaining, days, frequency, deadlineState)
    : null;

  return {
    id: input.id,
    name: input.name,
    plannedShare,
    contributed: Math.round(contributed * 100) / 100,
    remaining,
    covered,
    deadline: calendarDateKey(input.deadline),
    deadlineLabel,
    deadlineState,
    weekly,
    fortnightly,
    monthly,
    frequency,
    agreed,
    recurringAmount: covered ? null : recurringAmount,
    recurringPerLabel: frequency ? frequencyMeta(frequency).perLabel : null
  };
}

const toPence = (value?: number | null) => Math.round((Number(value) || 0) * 100);

export function singlePaymentAmount(targetAmount?: number | null): number | null {
  const target = Number(targetAmount) || 0;
  if (target <= 0) return null;
  return toPence(target) / 100;
}

export function canPaySinglePayment(
  recordedTotal: number,
  targetAmount?: number | null,
  isArchived = false
): boolean {
  if (isArchived) return false;
  const target = singlePaymentAmount(targetAmount);
  if (target === null) return false;
  return toPence(recordedTotal) >= toPence(target);
}

export function isCompletedPaymentStatus(status?: string | null): boolean {
  return status === 'executed' || status === 'approved';
}

export function paymentRequestStatusLabel(status?: string | null): string {
  if (isCompletedPaymentStatus(status)) return 'Payment completed';
  if (status === 'rejected') return 'Payment rejected';
  if (status === 'cancelled') return 'Payment request cancelled';
  return 'Waiting for approval';
}

export function paymentApprovalProgress(request: {
  approvals?: unknown[] | null;
  requiredApprovals?: number | null;
}): { current: number; total: number } {
  const requiredOthers = Math.max(0, Number(request.requiredApprovals) || 0);
  const recorded = Array.isArray(request.approvals) ? request.approvals.length : 0;
  return {
    current: recorded + 1,
    total: requiredOthers + 1
  };
}

export function personRecordId(person: unknown): string {
  if (person == null) return '';
  if (typeof person === 'object') {
    const record = person as { _id?: unknown; id?: unknown };
    if (record._id != null && record._id !== '') return String(record._id);
    if (record.id != null && record.id !== '') return String(record.id);
    return '';
  }
  return String(person);
}

export function findUserContributionPlan(
  plans: StoredContributionPlan[] | undefined,
  userId: string
): { frequency: ContributionFrequency; agreed: boolean; agreedAt: string | Date | null } | null {
  if (!userId || !Array.isArray(plans)) return null;
  const found = plans.find((plan) => personRecordId(plan.user) === String(userId));
  if (!found) return null;
  const frequency = parseContributionFrequency(found.frequency);
  if (!('value' in frequency)) return null;
  return {
    frequency: frequency.value,
    agreed: !!found.agreed,
    agreedAt: found.agreedAt || null
  };
}

export function remainingOtherApprovals(request: {
  approvals?: unknown[] | null;
  requiredApprovals?: number | null;
}): number {
  const requiredOthers = Math.max(0, Number(request.requiredApprovals) || 0);
  const recorded = Array.isArray(request.approvals) ? request.approvals.length : 0;
  return Math.max(0, requiredOthers - recorded);
}

export function waitingForMoreApprovalsLabel(request: {
  approvals?: unknown[] | null;
  requiredApprovals?: number | null;
}): string {
  const remaining = remainingOtherApprovals(request);
  if (remaining <= 0) return 'Waiting for approval';
  if (remaining === 1) return 'Waiting for 1 more approval';
  return `Waiting for ${remaining} more approvals`;
}

function voteUserId(entry: { user?: unknown } | unknown): string {
  if (!entry || typeof entry !== 'object') return String(entry || '');
  return personRecordId((entry as { user?: unknown }).user);
}

export function hasUserVotedOnPayment(
  request: {
    approvals?: Array<{ user?: unknown }> | null;
    rejections?: Array<{ user?: unknown }> | null;
  },
  currentUserId?: string | null
): { hasApproved: boolean; hasRejected: boolean } {
  const userId = String(currentUserId || '');
  if (!userId) return { hasApproved: false, hasRejected: false };
  const hasApproved = (request.approvals || []).some((entry) => voteUserId(entry) === userId);
  const hasRejected = (request.rejections || []).some((entry) => voteUserId(entry) === userId);
  return { hasApproved, hasRejected };
}

export function isPaymentProposer(
  request: { requestedBy?: unknown },
  currentUserId?: string | null
): boolean {
  const userId = String(currentUserId || '');
  if (!userId) return false;
  return personRecordId(request.requestedBy) === userId;
}

export function canActOnPendingPayment(
  request: {
    status?: string | null;
    requestedBy?: unknown;
    approvals?: Array<{ user?: unknown }> | null;
    rejections?: Array<{ user?: unknown }> | null;
  },
  currentUserId?: string | null,
  isArchived = false
): boolean {
  if (isArchived || request.status !== 'pending') return false;
  if (!currentUserId) return false;
  if (isPaymentProposer(request, currentUserId)) return false;
  const { hasApproved, hasRejected } = hasUserVotedOnPayment(request, currentUserId);
  return !hasApproved && !hasRejected;
}

export function paymentApprovalAccountId(request: { sharedAccount?: unknown }): string {
  return personRecordId(request.sharedAccount);
}

export function paymentApprovalAccountName(request: { sharedAccount?: unknown }): string {
  const account = request.sharedAccount;
  if (account && typeof account === 'object') {
    const name = String((account as { name?: unknown }).name || '').trim();
    if (name) return name;
  }
  return 'Shared Account';
}

export function parsePaymentDetails(description?: string | null): {
  payee: string;
  reference: string;
  raw: string;
} {
  const raw = String(description || '').trim();
  const payeeMatch = raw.match(/Payee:\s*([^·]+)/i);
  const referenceMatch = raw.match(/Ref:\s*([^·]+)/i);
  return {
    payee: (payeeMatch?.[1] || '').trim(),
    reference: (referenceMatch?.[1] || '').trim(),
    raw
  };
}

function matchesCompletedPaymentOutput(
  record: { amount?: number; description?: string },
  completedPayments: Array<{ status?: string; amount?: number; description?: string }> | null | undefined
): boolean {
  const completed = (completedPayments || []).filter((payment) => isCompletedPaymentStatus(payment.status));
  return completed.some((payment) => (
    toPence(payment.amount) === toPence(record.amount) &&
    String(payment.description || '') === String(record.description || '')
  ));
}

export function contributionProgressTotal(
  records: Array<{ type?: string; amount?: number; description?: string }> | null | undefined,
  completedPayments: Array<{ status?: string; amount?: number; description?: string }> | null | undefined = []
): number {
  return (records || []).reduce((sum, record) => {
    if (!record) return sum;
    const amount = Number(record.amount) || 0;
    if (record.type === 'input') return sum + amount;
    if (record.type !== 'output') return sum;
    return matchesCompletedPaymentOutput(record, completedPayments) ? sum : sum - amount;
  }, 0);
}

export function contributionExceedsPersonalShare(
  amount: number,
  remainingShare: number | null
): boolean {
  if (remainingShare === null) return false;
  return Number(amount) > remainingShare + 0.001;
}

export function formatMoneyAmount(amount: number): string {
  return `£${(Number(amount) || 0).toFixed(2)}`;
}

export function formatHistoryWhen(value: string | Date | null | undefined): string {
  if (!value) return '';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const date = parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const time = parsed.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${date} · ${time}`;
}

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function customerFacingPersonName(
  person: PersonSummary | string | null | undefined,
  owner?: PersonSummary | string | null,
  members?: Array<PersonSummary | string> | null
): string {
  const resolved = resolveLedgerTraveller(person, owner, members);
  const name = `${resolved.firstName || ''} ${resolved.lastName || ''}`.trim();
  if (name && !OBJECT_ID_PATTERN.test(name)) return name;
  const email = (resolved.email || '').trim();
  if (email.includes('@') && !OBJECT_ID_PATTERN.test(email)) return email;
  return 'Account activity';
}

export function paymentApprovalNotificationCopy(
  request: {
    amount?: number | null;
    requestedBy?: unknown;
    sharedAccount?: unknown;
  },
  owner?: PersonSummary | string | null,
  members?: Array<PersonSummary | string> | null
): { title: string; body: string; to: string } {
  const proposer = customerFacingPersonName(request.requestedBy as PersonSummary | string | null, owner, members);
  const amount = formatMoneyAmount(Number(request.amount) || 0);
  const accountName = paymentApprovalAccountName(request);
  const accountId = paymentApprovalAccountId(request);
  return {
    title: 'Payment approval needed',
    body: `${proposer} wants to pay ${amount} from “${accountName}”. Review and approve the payment.`,
    to: accountId ? `/shared-accounts/${accountId}` : '/events'
  };
}

export interface SharedAccountHistoryEntry {
  id: string;
  at: string;
  person: string;
  action: string;
  amount?: number | null;
}

type HistoryPaymentPerson = PersonSummary | string | null | undefined;

interface HistoryPaymentRequest {
  _id?: string;
  status?: string;
  amount?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  requestedBy?: HistoryPaymentPerson;
  approvals?: Array<{ user?: HistoryPaymentPerson; timestamp?: string }>;
  rejections?: Array<{ user?: HistoryPaymentPerson; timestamp?: string }>;
}

function historyTimestamp(...values: Array<string | Date | null | undefined>): string {
  for (const value of values) {
    if (!value) continue;
    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return '';
}

export function buildSharedAccountHistory(
  records: Array<{
    _id?: string;
    type?: string;
    amount?: number;
    date?: string;
    description?: string;
    user?: PersonSummary | string | null;
  }> | null | undefined,
  paymentRequests: HistoryPaymentRequest[] | null | undefined,
  owner?: PersonSummary | string | null,
  members?: Array<PersonSummary | string> | null
): SharedAccountHistoryEntry[] {
  const entries: SharedAccountHistoryEntry[] = [];
  const payments = paymentRequests || [];

  (records || []).forEach((record, index) => {
    if (!record) return;
    if (record.type === 'output' && matchesCompletedPaymentOutput(record, payments)) {
      return;
    }
    const amount = Number(record.amount) || 0;
    const money = formatMoneyAmount(amount);
    const action = record.type === 'output'
      ? `Reversed contribution ${money}`
      : `Contributed ${money}`;
    entries.push({
      id: String(record._id || `record-${index}`),
      at: historyTimestamp(record.date),
      person: customerFacingPersonName(record.user, owner, members),
      action,
      amount
    });
  });

  payments.forEach((request, requestIndex) => {
    const requestId = String(request._id || `payment-${requestIndex}`);
    const amount = Number(request.amount) || 0;
    const money = formatMoneyAmount(amount);
    const details = parsePaymentDetails(request.description);
    const toPayee = details.payee ? ` to ${details.payee}` : '';
    const proposer = customerFacingPersonName(request.requestedBy, owner, members);

    entries.push({
      id: `${requestId}-proposed`,
      at: historyTimestamp(request.createdAt, request.updatedAt),
      person: proposer,
      action: `Proposed final payment of ${money}${toPayee}`,
      amount
    });

    (request.approvals || []).forEach((approval, approvalIndex) => {
      entries.push({
        id: `${requestId}-approval-${approvalIndex}`,
        at: historyTimestamp(approval.timestamp, request.updatedAt, request.createdAt),
        person: customerFacingPersonName(approval.user, owner, members),
        action: 'Approved final payment'
      });
    });

    (request.rejections || []).forEach((rejection, rejectionIndex) => {
      entries.push({
        id: `${requestId}-rejection-${rejectionIndex}`,
        at: historyTimestamp(rejection.timestamp, request.updatedAt, request.createdAt),
        person: customerFacingPersonName(rejection.user, owner, members),
        action: 'Rejected final payment'
      });
    });

    if (request.status === 'cancelled') {
      entries.push({
        id: `${requestId}-cancelled`,
        at: historyTimestamp(request.updatedAt, request.createdAt),
        person: proposer,
        action: 'Cancelled final payment'
      });
    }

    if (isCompletedPaymentStatus(request.status)) {
      const lastApproval = (request.approvals || [])[(request.approvals || []).length - 1];
      entries.push({
        id: `${requestId}-completed`,
        at: historyTimestamp(request.updatedAt, lastApproval?.timestamp, request.createdAt),
        person: 'Final payment',
        action: details.payee ? `${money} to ${details.payee}` : money,
        amount
      });
    }
  });

  return entries.sort((a, b) => {
    const aTime = a.at ? new Date(a.at).getTime() : 0;
    const bTime = b.at ? new Date(b.at).getTime() : 0;
    return aTime - bTime;
  });
}

export function resolveLedgerTraveller(
  recordUser: PersonSummary | string | null | undefined,
  owner?: PersonSummary | string | null,
  members?: Array<PersonSummary | string> | null
): PersonSummary {
  if (recordUser && typeof recordUser === 'object') {
    return {
      _id: String(recordUser._id || ''),
      firstName: recordUser.firstName || '',
      lastName: recordUser.lastName || '',
      email: recordUser.email || ''
    };
  }

  const id = String(recordUser || '');
  const people = [owner, ...(members || [])].filter(Boolean) as Array<PersonSummary | string>;
  const match = people.find((person) => String(typeof person === 'string' ? person : person._id) === id);
  if (match && typeof match === 'object') {
    return {
      _id: String(match._id),
      firstName: match.firstName || '',
      lastName: match.lastName || '',
      email: match.email || ''
    };
  }

  return { _id: id, firstName: '', lastName: '', email: '' };
}

export function travellerDisplayName(person: PersonSummary): string {
  return customerFacingPersonName(person);
}

export function tripGroupMembers(event: TripHomeEvent): TripGroupMember[] {
  const people = new Map<string, TripGroupMember>();

  const add = (person: PersonSummary | string | null | undefined, isOrganiser = false) => {
    if (!person) return;
    const id = String(typeof person === 'string' ? person : person._id);
    if (!id || id === 'undefined') return;

    const existing = people.get(id);
    if (existing) {
      if (isOrganiser) existing.isOrganiser = true;
      return;
    }

    const first = typeof person === 'string' ? '' : (person.firstName || '').trim();
    const last = typeof person === 'string' ? '' : (person.lastName || '').trim();
    people.set(id, {
      id,
      name: first || last || 'Member',
      isOrganiser
    });
  };

  add(event.user, true);
  (event.sharedWith || []).forEach((person) => add(person));
  if (event.tripMoney) {
    add(event.tripMoney.owner);
    (event.tripMoney.members || []).forEach((person) => add(person));
  }

  return Array.from(people.values());
}

export const EXTRA_CLOSED_ACCOUNTS = 4;

export function accountClosedAtMs(account: {
  deletedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): number {
  const raw = account.deletedAt || account.updatedAt || '';
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortClosedNewestFirst<T extends {
  deletedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => accountClosedAtMs(b) - accountClosedAtMs(a));
}

export function visibleClosedAccounts<T>(sorted: T[], expanded: boolean, extra = EXTRA_CLOSED_ACCOUNTS): T[] {
  if (sorted.length === 0) return [];
  if (!expanded) return sorted.slice(0, 1);
  return sorted.slice(0, 1 + extra);
}
