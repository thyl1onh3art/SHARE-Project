import axios from 'axios';

export const MESSAGES_UNREAD_CHANGED = 'messages-unread-changed';
export const MESSAGES_LAST_SEEN_KEY = 'messagesLastSeenAt';

export const notifyMessagesUnreadChanged = () => {
  window.dispatchEvent(new Event(MESSAGES_UNREAD_CHANGED));
};

export const markMessagesSeenLocally = () => {
  sessionStorage.setItem(MESSAGES_LAST_SEEN_KEY, new Date().toISOString());
};

interface InviteListItem {
  status: string;
  recipientEmail?: string;
  readAt?: string | null;
  expiresAt: string;
  createdAt?: string;
}

export interface PaymentRequestItem {
  _id: string;
  amount: number;
  description?: string;
  requestType?: 'payment' | 'withdrawal';
  status: string;
  requiredApprovals?: number;
  sharedAccount?: { _id: string; name: string } | string;
  requestedBy?: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  approvals?: Array<{ user: { _id: string } | string }>;
  rejections?: Array<{ user: { _id: string } | string }>;
  createdAt?: string;
}

const getEntityId = (value: { _id?: string } | string | undefined): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || '';
};

const isUnreadReceivedInvite = (invite: InviteListItem, userEmail: string): boolean => {
  const normalizedEmail = userEmail.toLowerCase();
  const now = Date.now();

  if (invite.status !== 'pending') return false;
  if (invite.recipientEmail?.toLowerCase() !== normalizedEmail) return false;
  if (new Date(invite.expiresAt).getTime() <= now) return false;
  if (invite.readAt) return false;

  const lastSeenAt = sessionStorage.getItem(MESSAGES_LAST_SEEN_KEY);
  if (lastSeenAt && invite.createdAt && new Date(invite.createdAt) <= new Date(lastSeenAt)) {
    return false;
  }

  return true;
};

export const countUnreadReceivedInvites = (
  invites: InviteListItem[],
  userEmail: string
): number => {
  return invites.filter((invite) => isUnreadReceivedInvite(invite, userEmail)).length;
};

export const countActionablePaymentRequests = (
  paymentRequests: PaymentRequestItem[],
  userId: string
): number => {
  return paymentRequests.filter((request) => {
    if (request.status !== 'pending') return false;

    const requesterId = getEntityId(request.requestedBy);
    if (requesterId === userId) return false;

    const hasApproved = request.approvals?.some((approval) => getEntityId(approval.user) === userId);
    const hasRejected = request.rejections?.some((rejection) => getEntityId(rejection.user) === userId);
    return !hasApproved && !hasRejected;
  }).length;
};

export const fetchUnreadMessageCount = async (
  userEmail: string,
  userId?: string
): Promise<number> => {
  let inviteCount = 0;

  try {
    const response = await axios.get('/invites/unread-count');
    if (typeof response.data?.count === 'number') {
      inviteCount = response.data.count;
    }
  } catch {
    const listResponse = await axios.get('/invites/list');
    inviteCount = countUnreadReceivedInvites(listResponse.data, userEmail);
  }

  if (!userId) {
    return inviteCount;
  }

  let paymentCount = 0;
  try {
    const paymentResponse = await axios.get('/payment-requests/unread-count');
    if (typeof paymentResponse.data?.count === 'number') {
      paymentCount = paymentResponse.data.count;
    }
  } catch {
    const paymentListResponse = await axios.get('/payment-requests');
    paymentCount = countActionablePaymentRequests(paymentListResponse.data, userId);
  }

  return inviteCount + paymentCount;
};

export const markMessagesAsRead = async (): Promise<void> => {
  markMessagesSeenLocally();

  try {
    await axios.post('/invites/mark-read');
  } catch {
    // Local last-seen timestamp still clears invite badge items
  }

  notifyMessagesUnreadChanged();
};
