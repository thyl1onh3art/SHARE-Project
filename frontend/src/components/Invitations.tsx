import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import InviteRecipientsForm, {
  createEmptyInviteRecipient,
  InviteRecipient
} from './InviteRecipientsForm';
import { sendInvitesForAccount } from '../utils/inviteHelpers';
import { userFacingError } from '../utils/userFacingError';
import {
  canActOnPendingPayment,
  paymentApprovalNotificationCopy
} from '../utils/tripHome';

interface SharedAccountRef {
  _id: string;
  name: string;
  description?: string;
}

interface SenderRef {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}

interface Invitation {
  _id: string;
  sender: string | SenderRef;
  recipientEmail?: string;
  recipientPhone?: string;
  sharedAccount: string | SharedAccountRef | null;
  status: 'pending' | 'accepted' | 'cancelled';
  readAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
}

interface PaymentApprovalRequest {
  _id: string;
  status?: string;
  amount?: number;
  requestedBy?: SenderRef | string;
  sharedAccount?: string | SharedAccountRef | null;
  approvals?: Array<{ user?: SenderRef | string }>;
  rejections?: Array<{ user?: SenderRef | string }>;
}

const Invitations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [paymentApprovals, setPaymentApprovals] = useState<PaymentApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<{
    sharedAccountId: string;
    recipients: InviteRecipient[];
  }>({
    sharedAccountId: '',
    recipients: [createEmptyInviteRecipient()]
  });
  const [submitting, setSubmitting] = useState(false);
  const [actingInviteId, setActingInviteId] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const accountId = searchParams.get('account');
    if (accountId && accounts.length > 0) {
      const account = accounts.find(acc => acc._id === accountId);
      if (account) {
        setFormData(prev => ({
          ...prev,
          sharedAccountId: accountId,
          recipients: prev.recipients?.length
            ? prev.recipients
            : [createEmptyInviteRecipient()]
        }));
        setShowForm(true);
      }
    }
  }, [accounts, searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invitesResponse, accountsResponse, paymentsResponse] = await Promise.all([
        axios.get('/invites/list'),
        axios.get('/shared-accounts'),
        axios.get('/payment-requests').catch(() => ({ data: [] }))
      ]);

      setInvitations(invitesResponse.data);
      setAccounts(accountsResponse.data);
      setPaymentApprovals(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);

      // Clear recipient unread badge when opening Invitations (recipient-owned read state only)
      try {
        await axios.post('/invites/mark-read');
        setInvitations((prev) =>
          prev.map((invite) =>
            invite.status === 'pending' && !invite.readAt
              ? { ...invite, readAt: new Date().toISOString() }
              : invite
          )
        );
      } catch {
        // Non-blocking — list still loads
      }
    } catch (err: any) {
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (accountIdOrObject: string | SharedAccountRef | null) => {
    if (accountIdOrObject === null || accountIdOrObject === undefined) {
      return 'Shared Account';
    }
    if (typeof accountIdOrObject === 'object' && accountIdOrObject !== null && 'name' in accountIdOrObject) {
      return accountIdOrObject.name;
    }
    if (typeof accountIdOrObject === 'string') {
      const account = accounts.find(acc => acc._id === accountIdOrObject);
      return account ? account.name : 'Shared Account';
    }
    return 'Shared Account';
  };

  const getSenderName = (sender: string | SenderRef) => {
    if (typeof sender === 'object' && sender !== null) {
      if (sender.name) return sender.name;
      const full = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
      if (full) return full;
      if (sender.email) return sender.email;
    }
    return 'A member';
  };

  const getSenderId = (sender: string | SenderRef) => {
    if (typeof sender === 'object' && sender !== null) {
      return sender._id || '';
    }
    return sender || '';
  };

  const isSentByMe = (invitation: Invitation) => {
    const senderId = getSenderId(invitation.sender);
    return !!(user && senderId && (senderId === user.id || String(senderId) === String(user.id)));
  };

  const isReceivedByMe = (invitation: Invitation) => {
    if (!user?.email) return false;
    return !!(
      invitation.recipientEmail &&
      invitation.recipientEmail.toLowerCase() === user.email.toLowerCase()
    );
  };

  const buildShareMessage = (tripName: string) => {
    const inviter = user?.name || 'A friend';
    const loginUrl = `${window.location.origin}/login`;
    return (
      `${inviter} invited you to a Shared Account "${tripName}" on SHARE.\n\n` +
      `Log in or register here: ${loginUrl}\n` +
      `Then open Notifications to accept. SHARE records contributions; it does not hold a group bank balance.`
    );
  };

  const copyInviteMessage = async (tripName: string) => {
    const message = buildShareMessage(tripName);
    try {
      await navigator.clipboard.writeText(message);
      setShareNotice('Invite message copied. Paste it into WhatsApp or any chat.');
    } catch {
      setShareNotice('Could not copy automatically. Use Share via WhatsApp instead.');
    }
  };

  const shareViaWhatsApp = (tripName: string) => {
    const message = buildShareMessage(tripName);
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareNative = async (tripName: string) => {
    const message = buildShareMessage(tripName);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${tripName} on SHARE`,
          text: message
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    await copyInviteMessage(tripName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.sharedAccountId) {
        setError('Select which Shared Account to invite people to');
        setSubmitting(false);
        return;
      }

      const results = await sendInvitesForAccount(formData.sharedAccountId, formData.recipients);

      if (results.success === 0 && results.failed.length === 0) {
        setError('Add at least one member with an email or phone number');
        setSubmitting(false);
        return;
      }

      if (results.failed.length > 0) {
        setError(
          `${results.success} invitation(s) sent. Failed:\n${results.failed.join('\n')}`
        );
      }

      setFormData({
        sharedAccountId: formData.sharedAccountId,
        recipients: [createEmptyInviteRecipient()]
      });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(userFacingError(err, 'Failed to send invitation(s)'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    if (actingInviteId) return;
    setActingInviteId(invitation._id);
    setError('');
    try {
      await axios.post('/invites/accept', { inviteId: invitation._id });
      const potId =
        typeof invitation.sharedAccount === 'object'
          ? invitation.sharedAccount?._id
          : invitation.sharedAccount;
      if (potId) {
        navigate(`/shared-accounts/${potId}`);
        return;
      }
      await fetchData();
    } catch (err: any) {
      setError(userFacingError(err, 'Failed to accept invitation'));
    } finally {
      setActingInviteId('');
    }
  };

  const handleCancel = async (inviteId: string) => {
    if (actingInviteId) return;
    setActingInviteId(inviteId);
    setError('');
    try {
      await axios.post('/invites/cancel', { inviteId });
      await fetchData();
    } catch (err: any) {
      setError(userFacingError(err, 'Failed to cancel invitation'));
    } finally {
      setActingInviteId('');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const receivedInvites = invitations.filter(isReceivedByMe);
  const sentInvites = invitations.filter(isSentByMe);
  const pendingReceived = receivedInvites.filter(i => i.status === 'pending' && !isExpired(i.expiresAt));
  const pendingSent = sentInvites.filter(i => i.status === 'pending' && !isExpired(i.expiresAt));
  const currentUserId = user ? String((user as { _id?: string; id?: string })._id || user.id || '') : '';
  const seenApprovalIds = new Set<string>();
  const actionablePaymentApprovals = paymentApprovals.filter((request) => {
    if (!canActOnPendingPayment(request, currentUserId, false)) return false;
    if (!request._id || seenApprovalIds.has(request._id)) return false;
    seenApprovalIds.add(request._id);
    return true;
  });
  const selectedTripName = formData.sharedAccountId
    ? getAccountName(formData.sharedAccountId)
    : '';

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading invitations...</p>
      </div>
    );
  }

  const renderInviteCard = (invitation: Invitation, role: 'received' | 'sent') => {
    const tripName = getAccountName(invitation.sharedAccount);
    const expired = isExpired(invitation.expiresAt) && invitation.status === 'pending';
    const isUnread =
      role === 'received' &&
      invitation.status === 'pending' &&
      !expired &&
      !invitation.readAt;

    return (
      <div
        key={invitation._id}
        className="list-item invite-card"
        style={
          isUnread
            ? { borderLeft: '4px solid #2b6cb0', background: '#ebf8ff' }
            : undefined
        }
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: '1.05rem' }}>
            {role === 'received' ? `Join ${tripName}` : tripName}
            {isUnread && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2b6cb0',
                  textTransform: 'uppercase'
                }}
              >
                New
              </span>
            )}
          </strong>
          <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.35rem 0' }}>
            {role === 'received' ? (
              <>Invited by <strong>{getSenderName(invitation.sender)}</strong></>
            ) : (
              <>
                Invited{' '}
                <strong>
                  {invitation.recipientEmail || invitation.recipientPhone || 'member'}
                </strong>
              </>
            )}
          </p>
          <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
            Status:{' '}
            <span
              style={{
                color:
                  invitation.status === 'pending'
                    ? '#2b6cb0'
                    : invitation.status === 'accepted'
                      ? '#38a169'
                      : '#e53e3e',
                fontWeight: 600,
                textTransform: 'capitalize'
              }}
            >
              {invitation.status}
            </span>
            {expired && (
              <span style={{ color: '#e53e3e', marginLeft: '0.5rem' }}>· Expired</span>
            )}
          </p>
          <p style={{ color: '#718096', fontSize: '0.85rem', margin: '0.25rem 0' }}>
            Sent {new Date(invitation.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="invite-card-actions">
          {role === 'received' && invitation.status === 'pending' && !expired && (
            <button
              onClick={() => handleAccept(invitation)}
              className="btn btn-success invite-action-btn"
              disabled={!!actingInviteId}
            >
              {actingInviteId === invitation._id ? 'Opening…' : 'Accept invitation'}
            </button>
          )}
          {role === 'sent' && invitation.status === 'pending' && !expired && (
            <>
              <button
                type="button"
                onClick={() => copyInviteMessage(tripName)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Copy invite
              </button>
              <button
                type="button"
                onClick={() => shareViaWhatsApp(tripName)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                WhatsApp
              </button>
              <button
                onClick={() => handleCancel(invitation._id)}
                className="btn btn-danger invite-action-btn"
                disabled={!!actingInviteId}
              >
                {actingInviteId === invitation._id ? 'Cancelling…' : 'Cancel invite'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="invite-page">
      <div className="card">
        <div className="card-header" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h1 className="card-title" style={{ marginBottom: '0.35rem' }}>Notifications</h1>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>
              Shared Account invitations and payment approvals
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            disabled={accounts.length === 0}
          >
            {showForm ? 'Cancel' : 'Invite members'}
          </button>
        </div>
        <div className="trip-money-transparency" style={{ marginTop: '1rem' }}>
          Invitations add people to a Shared Account. They accept after they log in — there is no public invite link yet.
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}

      {shareNotice && (
        <div
          className="alert"
          style={{
            background: '#e6fffa',
            border: '1px solid #81e6d9',
            color: '#234e52',
            marginBottom: '1rem'
          }}
        >
          {shareNotice}
          <button
            type="button"
            onClick={() => setShareNotice('')}
            style={{
              marginLeft: '0.75rem',
              background: 'transparent',
              border: 'none',
              color: '#234e52',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Nobody to invite yet</h2>
          <p style={{ color: '#4a5568' }}>
            Create a Shared Account first, then invite members.
          </p>
          <Link to="/events" className="btn btn-primary">
            Create a Shared Account
          </Link>
        </div>
      )}

      {showForm && accounts.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem' }}>Invite members</h2>
          <p style={{ color: '#4a5568', marginTop: 0 }}>
            Choose the Shared Account, add members, then share a WhatsApp-friendly message if you like.
          </p>

          {formData.sharedAccountId && (
            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1rem'
              }}
            >
              <p style={{ color: '#0369a1', margin: 0, fontSize: '0.9rem' }}>
                <strong>Inviting to:</strong> {selectedTripName}
              </p>
              <div className="invite-share-row" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => copyInviteMessage(selectedTripName)}
                >
                  Copy invite
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => shareViaWhatsApp(selectedTripName)}
                >
                  Share on WhatsApp
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => shareNative(selectedTripName)}
                >
                  Share…
                </button>
              </div>
              <p style={{ color: '#0369a1', fontSize: '0.8rem', margin: '0.65rem 0 0' }}>
                Share copies a message with the SHARE login page. Friends still need an email invite (or matching account email) to accept in Notifications — SHARE does not yet issue public invite links.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Shared Account</label>
              <select
                className="form-select"
                value={formData.sharedAccountId}
                onChange={(e) => setFormData({ ...formData, sharedAccountId: e.target.value })}
                required
              >
                <option value="">Select a Shared Account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <InviteRecipientsForm
                recipients={formData.recipients}
                onChange={(recipients) => setFormData({ ...formData, recipients })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                `Send Shared Account invitation${formData.recipients.length > 1 ? 's' : ''}`
              )}
            </button>
          </form>
        </div>
      )}

      {actionablePaymentApprovals.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '0.35rem' }}>Payment approval needed</h2>
          <p style={{ color: '#4a5568', marginTop: 0, fontSize: '0.9rem' }}>
            A member wants to record a final payment. Review it on the Shared Account.
          </p>
          <div className="list">
            {actionablePaymentApprovals.map((request) => {
              const copy = paymentApprovalNotificationCopy(request);
              return (
                <Link
                  key={request._id}
                  to={copy.to}
                  className="list-item invite-card"
                  style={{
                    borderLeft: '4px solid #c05621',
                    background: '#fffaf0',
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '1.05rem' }}>{copy.title}</strong>
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
                      {copy.body}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>Pending invitations for you</h2>
        <p style={{ color: '#4a5568', marginTop: 0, fontSize: '0.9rem' }}>
          Accept to join this Shared Account.
        </p>
        {pendingReceived.length === 0 ? (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">No pending invitations</p>
            <p style={{ marginBottom: 0 }}>
              When a friend invites your email to their Shared Account, it will show up here.
            </p>
          </div>
        ) : (
          <div className="list">
            {pendingReceived.map((invitation) => renderInviteCard(invitation, 'received'))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>Invitations you sent</h2>
        <p style={{ color: '#4a5568', marginTop: 0, fontSize: '0.9rem' }}>
          Track who you invited and reshare the invite message.
        </p>
        {sentInvites.length === 0 ? (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">Nobody has been invited yet</p>
            <p>
              Invite members to start contributing together.
            </p>
            {accounts.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                Invite members
              </button>
            )}
          </div>
        ) : (
          <div className="list">
            {sentInvites.map((invitation) => renderInviteCard(invitation, 'sent'))}
          </div>
        )}
      </div>

      {(pendingReceived.length > 0 || pendingSent.length > 0 || invitations.some(i => i.status === 'accepted')) && (
        <div className="grid grid-3 invite-stats">
          <div className="card">
            <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem', fontSize: '1rem' }}>Your invitations</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#2b6cb0', margin: 0 }}>
              {invitations.length}
            </p>
          </div>
          <div className="card">
            <h3 style={{ color: '#38a169', marginBottom: '0.5rem', fontSize: '1rem' }}>Accepted</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#38a169', margin: 0 }}>
              {invitations.filter(inv => inv.status === 'accepted').length}
            </p>
          </div>
          <div className="card">
            <h3 style={{ color: '#dd6b20', marginBottom: '0.5rem', fontSize: '1rem' }}>Pending</h3>
            <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#dd6b20', margin: 0 }}>
              {invitations.filter(inv => inv.status === 'pending').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invitations;
