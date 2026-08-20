import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  expiresAt: string;
  createdAt: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
}

const Invitations: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareNotice, setShareNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sharedAccountId: '',
    recipients: [{ recipientEmail: '', recipientPhone: '' }]
  });
  const [submitting, setSubmitting] = useState(false);
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
          recipients: prev.recipients || [{ recipientEmail: '', recipientPhone: '' }]
        }));
        setShowForm(true);
      }
    }
  }, [accounts, searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invitesResponse, accountsResponse] = await Promise.all([
        axios.get('/invites/list'),
        axios.get('/shared-accounts')
      ]);

      setInvitations(invitesResponse.data);
      setAccounts(accountsResponse.data);
    } catch (err: any) {
      setError('Failed to load trip invitations');
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (accountIdOrObject: string | SharedAccountRef | null) => {
    if (accountIdOrObject === null || accountIdOrObject === undefined) {
      return 'Shared trip costs';
    }
    if (typeof accountIdOrObject === 'object' && accountIdOrObject !== null && 'name' in accountIdOrObject) {
      return accountIdOrObject.name;
    }
    if (typeof accountIdOrObject === 'string') {
      const account = accounts.find(acc => acc._id === accountIdOrObject);
      return account ? account.name : 'Shared trip costs';
    }
    return 'Shared trip costs';
  };

  const getSenderName = (sender: string | SenderRef) => {
    if (typeof sender === 'object' && sender !== null) {
      if (sender.name) return sender.name;
      const full = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
      if (full) return full;
      if (sender.email) return sender.email;
    }
    return 'A traveller';
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
      `${inviter} invited you to join "${tripName}" on SHARE — coordinate shared trip costs together.\n\n` +
      `Log in or register here: ${loginUrl}\n` +
      `Then open Invitations to accept. SHARE records contributions; it does not hold a group bank balance.`
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
      const validRecipients = formData.recipients.filter(
        r => r.recipientEmail.trim() || r.recipientPhone.trim()
      );

      if (!formData.sharedAccountId) {
        setError('Select which shared trip costs to invite people to');
        setSubmitting(false);
        return;
      }

      if (validRecipients.length === 0) {
        setError('Add at least one traveller with an email or phone number');
        setSubmitting(false);
        return;
      }

      // Backend has no /invites/send-bulk route — send sequentially via existing /invites/send
      const results = { success: 0, failed: [] as string[] };
      for (const recipient of validRecipients) {
        try {
          await axios.post('/invites/send', {
            sharedAccountId: formData.sharedAccountId,
            recipientEmail: recipient.recipientEmail.trim() || undefined,
            recipientPhone: recipient.recipientPhone.trim() || undefined
          });
          results.success += 1;
        } catch (err: any) {
          const label = recipient.recipientEmail || recipient.recipientPhone || 'recipient';
          results.failed.push(`${label}: ${err.response?.data?.message || 'failed'}`);
        }
      }

      if (results.failed.length > 0) {
        setError(
          `${results.success} invitation(s) sent. Failed:\n${results.failed.join('\n')}`
        );
      }

      setFormData({ sharedAccountId: formData.sharedAccountId, recipients: [{ recipientEmail: '', recipientPhone: '' }] });
      setShowForm(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation(s)');
    } finally {
      setSubmitting(false);
    }
  };

  const addRecipient = () => {
    setFormData({
      ...formData,
      recipients: [...formData.recipients, { recipientEmail: '', recipientPhone: '' }]
    });
  };

  const removeRecipient = (index: number) => {
    if (formData.recipients.length > 1) {
      setFormData({
        ...formData,
        recipients: formData.recipients.filter((_, i) => i !== index)
      });
    }
  };

  const updateRecipient = (index: number, field: 'recipientEmail' | 'recipientPhone', value: string) => {
    const updatedRecipients = [...formData.recipients];
    updatedRecipients[index] = { ...updatedRecipients[index], [field]: value };
    setFormData({ ...formData, recipients: updatedRecipients });
  };

  const handleAccept = async (inviteId: string) => {
    try {
      await axios.post('/invites/accept', { inviteId });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    }
  };

  const handleCancel = async (inviteId: string) => {
    try {
      await axios.post('/invites/cancel', { inviteId });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const receivedInvites = invitations.filter(isReceivedByMe);
  const sentInvites = invitations.filter(isSentByMe);
  const pendingReceived = receivedInvites.filter(i => i.status === 'pending' && !isExpired(i.expiresAt));
  const pendingSent = sentInvites.filter(i => i.status === 'pending' && !isExpired(i.expiresAt));
  const selectedTripName = formData.sharedAccountId
    ? getAccountName(formData.sharedAccountId)
    : '';

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading trip invitations...</p>
      </div>
    );
  }

  const renderInviteCard = (invitation: Invitation, role: 'received' | 'sent') => {
    const tripName = getAccountName(invitation.sharedAccount);
    const expired = isExpired(invitation.expiresAt) && invitation.status === 'pending';

    return (
      <div key={invitation._id} className="list-item invite-card">
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: '1.05rem' }}>
            {role === 'received' ? `Join ${tripName}` : tripName}
          </strong>
          <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.35rem 0' }}>
            {role === 'received' ? (
              <>Invited by <strong>{getSenderName(invitation.sender)}</strong></>
            ) : (
              <>
                Invited{' '}
                <strong>
                  {invitation.recipientEmail || invitation.recipientPhone || 'traveller'}
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
              onClick={() => handleAccept(invitation._id)}
              className="btn btn-success"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Accept invitation
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
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Cancel invite
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
            <h1 className="card-title" style={{ marginBottom: '0.35rem' }}>Trip invitations</h1>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>
              Invite friends to your shared trip costs so everyone can record contributions and finish square.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            disabled={accounts.length === 0}
          >
            {showForm ? 'Cancel' : 'Invite travellers'}
          </button>
        </div>
        <div className="trip-money-transparency" style={{ marginTop: '1rem' }}>
          Invitations join people to shared trip costs in SHARE. Accepting happens after they log in — there is no public invite token link yet.
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
            Set up shared trip costs in Trip Money first, then invite your travel group to start coordinating.
          </p>
          <Link to="/shared-accounts" className="btn btn-primary">
            Set up Trip Money
          </Link>
        </div>
      )}

      {showForm && accounts.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem' }}>Invite friends to this trip</h2>
          <p style={{ color: '#4a5568', marginTop: 0 }}>
            Choose the shared trip costs pot, add travellers, then share a WhatsApp-friendly message if you like.
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
                Share copies a message with the SHARE login page. Friends still need an email invite (or matching account email) to accept in Invitations — SHARE does not yet issue public invite links.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Shared trip costs</label>
              <select
                className="form-select"
                value={formData.sharedAccountId}
                onChange={(e) => setFormData({ ...formData, sharedAccountId: e.target.value })}
                required
              >
                <option value="">Select a trip pot</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}
              >
                <label className="form-label" style={{ margin: 0 }}>Travellers to invite</label>
                <button
                  type="button"
                  onClick={addRecipient}
                  className="btn btn-secondary"
                  style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                >
                  + Add traveller
                </button>
              </div>

              {formData.recipients.map((recipient, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    background: '#f7fafc',
                    position: 'relative'
                  }}
                >
                  {formData.recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: '#fee2e2',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#991b1b'
                      }}
                      title="Remove traveller"
                    >
                      ×
                    </button>
                  )}
                  <p style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                    Traveller {index + 1}
                  </p>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={recipient.recipientEmail}
                      onChange={(e) => updateRecipient(index, 'recipientEmail', e.target.value)}
                      placeholder="friend@example.com"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone (optional)</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={recipient.recipientPhone}
                      onChange={(e) => updateRecipient(index, 'recipientPhone', e.target.value)}
                      placeholder="+447700900123"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner"></span>
              ) : (
                `Send trip invitation${formData.recipients.length > 1 ? 's' : ''}`
              )}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>Pending invitations for you</h2>
        <p style={{ color: '#4a5568', marginTop: 0, fontSize: '0.9rem' }}>
          Accept to join the shared trip costs pot.
        </p>
        {pendingReceived.length === 0 ? (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">No pending invitations</p>
            <p style={{ marginBottom: 0 }}>
              When a friend invites your email to their trip pot, it will show up here.
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
              Invite your travel group to start coordinating the trip.
            </p>
            {accounts.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                Invite travellers
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
