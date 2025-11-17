import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

interface SharedAccountRef {
  _id: string;
  name: string;
}

interface Invitation {
  _id: string;
  sender: string;
  recipientEmail?: string;
  recipientPhone?: string;
  sharedAccount: string | SharedAccountRef | null; // Can be ID string, populated object, or null
  status: 'pending' | 'accepted' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

interface SharedAccount {
  _id: string;
  name: string;
}

const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    sharedAccountId: '',
    recipients: [{ recipientEmail: '', recipientPhone: '' }] // Array of recipients
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Check if we should pre-select an account and show the form
    const accountId = searchParams.get('account');
    if (accountId && accounts.length > 0) {
      const account = accounts.find(acc => acc._id === accountId);
      if (account) {
        setFormData(prev => ({ ...prev, sharedAccountId: accountId, recipients: prev.recipients || [{ recipientEmail: '', recipientPhone: '' }] }));
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
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Filter out empty recipients and validate
      const validRecipients = formData.recipients.filter(
        r => r.recipientEmail.trim() || r.recipientPhone.trim()
      );

      if (validRecipients.length === 0) {
        setError('Please add at least one recipient with email or phone');
        setSubmitting(false);
        return;
      }

      // Use bulk endpoint if multiple recipients, otherwise use single endpoint
      if (validRecipients.length === 1) {
        // Single recipient - use original endpoint for backward compatibility
        await axios.post('/invites/send', {
          sharedAccountId: formData.sharedAccountId,
          recipientEmail: validRecipients[0].recipientEmail.trim() || undefined,
          recipientPhone: validRecipients[0].recipientPhone.trim() || undefined
        });
      } else {
        // Multiple recipients - use bulk endpoint
        const response = await axios.post('/invites/send-bulk', {
          sharedAccountId: formData.sharedAccountId,
          recipients: validRecipients.map(r => ({
            recipientEmail: r.recipientEmail.trim() || undefined,
            recipientPhone: r.recipientPhone.trim() || undefined
          }))
        });

        // Show detailed results if some failed
        if (response.data.failedCount > 0) {
          const failedMessages = response.data.results.failed.map((f: any) => 
            `${f.recipient.recipientEmail || f.recipient.recipientPhone}: ${f.error}`
          ).join('\n');
          alert(`${response.data.successCount} invitation(s) sent successfully.\n\nFailed:\n${failedMessages}`);
        } else {
          alert(`${response.data.successCount} invitation(s) sent successfully!`);
        }
      }
      
      setFormData({ sharedAccountId: '', recipients: [{ recipientEmail: '', recipientPhone: '' }] });
      setShowForm(false);
      fetchData();
      
      // Clear any previous errors
      setError('');
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
      setError('Failed to accept invitation');
    }
  };

  const handleCancel = async (inviteId: string) => {
    try {
      await axios.post('/invites/cancel', { inviteId });
      fetchData();
    } catch (err: any) {
      setError('Failed to cancel invitation');
    }
  };

  const getAccountName = (accountIdOrObject: string | SharedAccountRef | null) => {
    // Handle null case
    if (accountIdOrObject === null || accountIdOrObject === undefined) {
      return 'Unknown Account';
    }
    // If it's already a populated object with name, use it directly
    if (typeof accountIdOrObject === 'object' && accountIdOrObject !== null && 'name' in accountIdOrObject) {
      return accountIdOrObject.name;
    }
    // Otherwise, it's an ID string - look it up in the accounts list
    if (typeof accountIdOrObject === 'string') {
      const account = accounts.find(acc => acc._id === accountIdOrObject);
      return account ? account.name : 'Unknown Account';
    }
    // Fallback for any other case
    return 'Unknown Account';
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading invitations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Invitations</h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Send Invitation'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {accounts.length === 0 && (
        <div className="alert" style={{
          background: '#e6fffa',
          border: '1px solid #81e6d9',
          color: '#234e52',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>💡</span>
            <strong>Getting Started</strong>
          </div>
          <p style={{ margin: 0 }}>
            To send invitations, you first need to create a shared account. 
            <a href="/shared-accounts" style={{ color: '#234e52', textDecoration: 'underline', marginLeft: '0.5rem' }}>
              Create your first shared account →
            </a>
          </p>
        </div>
      )}

      {/* Send Invitation Form */}
      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Send New Invitation</h2>
          
          {formData.sharedAccountId && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#0369a1', margin: 0, fontSize: '0.9rem' }}>
                <strong>Inviting to:</strong> {getAccountName(formData.sharedAccountId)}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Shared Account</label>
              {accounts.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  background: '#f7fafc',
                  border: '2px dashed #cbd5e0',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#4a5568', margin: '0 0 1rem 0' }}>
                    No shared accounts available. You need to create a shared account first.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate to shared accounts page
                      window.location.href = '/shared-accounts';
                    }}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px' }}
                  >
                    Create Shared Account
                  </button>
                </div>
              ) : (
                <select
                  className="form-select"
                  value={formData.sharedAccountId}
                  onChange={(e) => setFormData({ ...formData, sharedAccountId: e.target.value })}
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label">Recipients</label>
                <button
                  type="button"
                  onClick={addRecipient}
                  className="btn btn-outline"
                  style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                >
                  + Add Recipient
                </button>
              </div>

              {formData.recipients.map((recipient, index) => (
                <div key={index} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  background: '#f7fafc',
                  position: 'relative'
                }}>
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
                      title="Remove recipient"
                    >
                      ×
                    </button>
                  )}
                  <p style={{ fontSize: '0.85rem', color: '#4a5568', marginBottom: '0.75rem', fontWeight: 'bold' }}>
                    Recipient {index + 1}
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
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              ))}

              <p style={{ fontSize: '0.8rem', color: '#4a5568', marginTop: '0.5rem' }}>
                💡 Tip: Add multiple recipients to invite several people at once. Each recipient needs at least an email or phone number.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || accounts.length === 0}
            >
              {submitting ? <span className="spinner"></span> : `Send ${formData.recipients.length > 1 ? `${formData.recipients.length} ` : ''}Invitation${formData.recipients.length > 1 ? 's' : ''}`}
            </button>
          </form>
        </div>
      )}

      {/* Invitations List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your Invitations</h2>
        
        {invitations.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No invitations yet. Send your first invitation above!
          </p>
        ) : (
          <div className="list">
            {invitations.map((invitation) => (
              <div key={invitation._id} className="list-item">
                <div>
                  <strong>{getAccountName(invitation.sharedAccount)}</strong>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    {invitation.recipientEmail && `Email: ${invitation.recipientEmail}`}
                    {invitation.recipientEmail && invitation.recipientPhone && ' • '}
                    {invitation.recipientPhone && `Phone: ${invitation.recipientPhone}`}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    Status: <span style={{ 
                      color: invitation.status === 'pending' ? '#2b6cb0' : 
                             invitation.status === 'accepted' ? '#38a169' : '#e53e3e'
                    }}>
                      {invitation.status}
                    </span>
                    {isExpired(invitation.expiresAt) && invitation.status === 'pending' && (
                      <span style={{ color: '#e53e3e', marginLeft: '0.5rem' }}>• Expired</span>
                    )}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    Sent: {new Date(invitation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {invitation.status === 'pending' && !isExpired(invitation.expiresAt) && (
                    <>
                      <button
                        onClick={() => handleAccept(invitation._id)}
                        className="btn btn-success"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleCancel(invitation._id)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ color: '#2b6cb0', marginBottom: '1rem' }}>📨 Total Invitations</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2b6cb0' }}>
            {invitations.length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Accepted</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            {invitations.filter(inv => inv.status === 'accepted').length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>⏳ Pending</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            {invitations.filter(inv => inv.status === 'pending').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Invitations;
