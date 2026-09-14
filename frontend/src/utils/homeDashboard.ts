import {
  StoredContributionPlan,
  canActOnPendingPayment,
  canPaySinglePayment,
  contributionProgressTotal,
  formatContributionDeadline,
  formatGbp,
  hasAgreedContributionPlan,
  isCompletedPaymentStatus,
  isPaymentProposer,
  paymentApprovalAccountId,
  personRecordId,
  startOfLocalCalendarDay
} from './tripHome';

export const HOME_ACCOUNT_PREVIEW_LIMIT = 4;
export const HOME_ATTENTION_LIMIT = 5;

export type HomeAccountStatus =
  | 'approval_needed'
  | 'ready_to_pay'
  | 'ready_to_close'
  | 'waiting_for_approval'
  | 'payment_completed'
  | 'contributing';

export interface HomeAccountSummary {
  id: string;
  name: string;
  recordedTotal: number;
  targetAmount: number | null;
  progressPercent: number;
  goalDate?: string | Date | null;
  goalLabel: string | null;
  status: HomeAccountStatus;
  statusLabel: string;
  needsAction: boolean;
  needsPlan: boolean;
  isOrganiser: boolean;
  openTo: string;
}

export type HomeAttentionKind =
  | 'invitation'
  | 'payment_approval'
  | 'pay_now'
  | 'close_account'
  | 'setup_plan';

export interface HomeAttentionItem {
  id: string;
  kind: HomeAttentionKind;
  title: string;
  accountName: string;
  actionLabel: string;
  to: string;
}

export interface HomeInviteInput {
  _id?: string;
  status?: string;
  recipientEmail?: string;
  expiresAt?: string | Date;
  sharedAccount?: unknown;
  sender?: unknown;
}

export interface HomePaymentInput {
  _id?: string;
  status?: string;
  sharedAccount?: unknown;
  requestedBy?: unknown;
  approvals?: Array<{ user?: unknown }> | null;
  rejections?: Array<{ user?: unknown }> | null;
}

export interface HomeAccountInput {
  _id?: string;
  name?: string;
  isDeleted?: boolean;
  targetAmount?: number | null;
  targetDate?: string | Date | null;
  owner?: unknown;
  members?: unknown[];
  financeRecords?: Array<{ type?: string; amount?: number; description?: string }>;
  contributionPlans?: StoredContributionPlan[];
}

export interface HomeEventInput {
  title?: string;
  eventDate?: string;
  tripMoney?: {
    _id?: string;
    name?: string;
    recordedTotal?: number;
    targetAmount?: number | null;
    targetDate?: string | null;
    owner?: unknown;
    isDeleted?: boolean;
  } | null;
}

export function homeProgressPercent(recordedTotal: number, targetAmount: number | null): number {
  if (!(Number(targetAmount) > 0)) return 0;
  const percent = (Number(recordedTotal) || 0) / Number(targetAmount);
  return Math.min(100, Math.max(0, Math.round(percent * 100)));
}

export function homeProgressText(recordedTotal: number, targetAmount: number | null): string {
  const funded = formatGbp(recordedTotal);
  if (!(Number(targetAmount) > 0)) return funded;
  return `${funded} of ${formatGbp(targetAmount as number)}`;
}

function paymentsForAccount(payments: HomePaymentInput[], accountId: string): HomePaymentInput[] {
  return (payments || []).filter((payment) => paymentApprovalAccountId(payment) === accountId);
}

function inviteAccountName(invite: HomeInviteInput): string {
  const account = invite.sharedAccount;
  if (account && typeof account === 'object') {
    const name = String((account as { name?: unknown }).name || '').trim();
    if (name) return name;
  }
  return 'Shared Account';
}

export function isPendingReceivedInvite(
  invite: HomeInviteInput,
  userEmail?: string | null,
  now: Date = new Date()
): boolean {
  if (invite.status !== 'pending') return false;
  const email = String(userEmail || '').trim().toLowerCase();
  const recipient = String(invite.recipientEmail || '').trim().toLowerCase();
  if (!email || recipient !== email) return false;
  if (invite.expiresAt) {
    const expires = new Date(invite.expiresAt).getTime();
    if (Number.isFinite(expires) && expires <= now.getTime()) return false;
  }
  return true;
}

function goalSortValue(goalDate?: string | Date | null): number {
  const start = startOfLocalCalendarDay(goalDate || null);
  return start ? start.getTime() : Number.POSITIVE_INFINITY;
}

export function sortHomeAccounts(accounts: HomeAccountSummary[]): HomeAccountSummary[] {
  return [...accounts].sort((a, b) => {
    if (a.needsAction !== b.needsAction) return a.needsAction ? -1 : 1;
    const dateDiff = goalSortValue(a.goalDate) - goalSortValue(b.goalDate);
    if (dateDiff !== 0) return dateDiff;
    return a.name.localeCompare(b.name, 'en-GB');
  });
}

export function previewHomeAccounts(accounts: HomeAccountSummary[]): HomeAccountSummary[] {
  return sortHomeAccounts(accounts).slice(0, HOME_ACCOUNT_PREVIEW_LIMIT);
}

export function buildHomeAccountSummaries(input: {
  accounts: HomeAccountInput[];
  events?: HomeEventInput[];
  payments?: HomePaymentInput[];
  userId: string;
}): HomeAccountSummary[] {
  const accounts = input.accounts || [];
  const events = input.events || [];
  const payments = input.payments || [];
  const userId = String(input.userId || '');
  const eventByPot = new Map<string, HomeEventInput>();
  events.forEach((event) => {
    const potId = event?.tripMoney?._id;
    if (potId && !event.tripMoney?.isDeleted) {
      eventByPot.set(String(potId), event);
    }
  });

  const summaries: HomeAccountSummary[] = [];
  accounts.forEach((account) => {
    if (!account?._id || account.isDeleted) return;
    const id = String(account._id);
    const event = eventByPot.get(id);
    const tripMoney = event?.tripMoney;
    const owner = tripMoney?.owner || account.owner;
    const isOrganiser = personRecordId(owner) === userId;
    const accountPayments = paymentsForAccount(payments, id);
    const recorded = tripMoney?.recordedTotal != null
      ? Number(tripMoney.recordedTotal)
      : contributionProgressTotal(account.financeRecords, accountPayments);
    const target = Number(tripMoney?.targetAmount ?? account.targetAmount) || 0;
    const targetAmount = target > 0 ? target : null;
    const goalDate = account.targetDate || tripMoney?.targetDate || event?.eventDate || null;
    const pending = accountPayments.find((payment) => payment.status === 'pending') || null;
    const completed = accountPayments.some((payment) => isCompletedPaymentStatus(payment.status));
    const readyToPay = canPaySinglePayment(recorded, targetAmount, false) && !pending && !completed;
    const approvalNeeded = pending ? canActOnPendingPayment(pending, userId, false) : false;
    const waiting = !!(pending && isPaymentProposer(pending, userId));
    const readyToClose = completed && isOrganiser;
    const memberIds = (account.members || []).map((member) => personRecordId(member));
    const isAcceptedMember = memberIds.includes(userId);
    const needsPlan = isAcceptedMember && !isOrganiser && !hasAgreedContributionPlan(account.contributionPlans, userId);

    let status: HomeAccountStatus = 'contributing';
    let statusLabel = 'Open';
    if (approvalNeeded) {
      status = 'approval_needed';
      statusLabel = 'Payment approval needed';
    } else if (readyToPay) {
      status = 'ready_to_pay';
      statusLabel = 'Ready to pay';
    } else if (readyToClose) {
      status = 'ready_to_close';
      statusLabel = 'Payment completed';
    } else if (waiting) {
      status = 'waiting_for_approval';
      statusLabel = 'Waiting for approval';
    } else if (completed) {
      status = 'payment_completed';
      statusLabel = 'Payment completed';
    }

    summaries.push({
      id,
      name: String(event?.title || account.name || 'Shared Account').trim() || 'Shared Account',
      recordedTotal: recorded,
      targetAmount,
      progressPercent: homeProgressPercent(recorded, targetAmount),
      goalDate,
      goalLabel: formatContributionDeadline(goalDate ? String(goalDate) : null),
      status,
      statusLabel,
      needsAction: approvalNeeded || readyToPay || readyToClose || needsPlan,
      needsPlan,
      isOrganiser,
      openTo: `/shared-accounts/${id}`
    });
  });

  return summaries;
}

export function buildHomeAttentionItems(input: {
  accounts: HomeAccountSummary[];
  invites?: HomeInviteInput[];
  userEmail?: string | null;
  now?: Date;
}): HomeAttentionItem[] {
  const items: HomeAttentionItem[] = [];
  const now = input.now || new Date();

  (input.invites || []).forEach((invite) => {
    if (!isPendingReceivedInvite(invite, input.userEmail, now)) return;
    const accountName = inviteAccountName(invite);
    items.push({
      id: `invite-${invite._id || accountName}`,
      kind: 'invitation',
      title: 'Invitation to join',
      accountName,
      actionLabel: 'Review',
      to: '/invitations'
    });
  });

  sortHomeAccounts(input.accounts || []).forEach((account) => {
    if (account.status === 'approval_needed') {
      items.push({
        id: `approval-${account.id}`,
        kind: 'payment_approval',
        title: 'Payment approval needed',
        accountName: account.name,
        actionLabel: 'Review',
        to: account.openTo
      });
    }
    if (account.status === 'ready_to_pay') {
      items.push({
        id: `pay-${account.id}`,
        kind: 'pay_now',
        title: 'Shared Account ready to pay',
        accountName: account.name,
        actionLabel: 'Open account',
        to: `${account.openTo}?pay=now`
      });
    }
    if (account.status === 'ready_to_close') {
      items.push({
        id: `close-${account.id}`,
        kind: 'close_account',
        title: 'Payment completed',
        accountName: account.name,
        actionLabel: 'Close Shared Account',
        to: `${account.openTo}?close=now`
      });
    }
    if (account.needsPlan) {
      items.push({
        id: `plan-${account.id}`,
        kind: 'setup_plan',
        title: 'Set up your contribution plan',
        accountName: account.name,
        actionLabel: 'Set up',
        to: `${account.openTo}?setupPlan=1`
      });
    }
  });

  return items.slice(0, HOME_ATTENTION_LIMIT);
}
