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

export function tripCountdownLabel(
  eventDate: string,
  eventTime?: string,
  now: Date = new Date()
): string {
  const start = new Date(`${eventDate}T${eventTime || '00:00'}`);
  if (Number.isNaN(start.getTime())) {
    return '';
  }

  const startDay = new Date(`${eventDate}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  startDay.setHours(0, 0, 0, 0);

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
  if (!targetDate) return null;
  const parsed = new Date(targetDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
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

export function contributionProgressTotal(
  records: Array<{ type?: string; amount?: number; description?: string }> | null | undefined,
  completedPayments: Array<{ status?: string; amount?: number; description?: string }> | null | undefined = []
): number {
  const completed = (completedPayments || []).filter((payment) => isCompletedPaymentStatus(payment.status));
  return (records || []).reduce((sum, record) => {
    if (!record) return sum;
    const amount = Number(record.amount) || 0;
    if (record.type === 'input') return sum + amount;
    if (record.type !== 'output') return sum;
    const isFinalPaymentOutput = completed.some((payment) => (
      toPence(payment.amount) === toPence(amount) &&
      String(payment.description || '') === String(record.description || '')
    ));
    return isFinalPaymentOutput ? sum : sum - amount;
  }, 0);
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
  const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  return name || person.email || 'Traveller';
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
      name: first || last || 'Traveller',
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
