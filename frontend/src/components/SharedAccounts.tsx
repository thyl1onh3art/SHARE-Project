import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SharedAccount {
  _id: string;
  name: string;
  owner: string;
  members: string[];
  financeRecords: any[];
  createdAt: string;
}

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    memberIds: ''
  });
  const [invites, setInvites] = useState<Array<{ recipientEmail: string; recipientPhone: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [inviteFormData, setInviteFormData] = useState({
    recipientEmail: '',
    recipientPhone: ''
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('SharedAccounts: Component mounted, fetching accounts...');
    fetchAccounts();
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    // Check if we should show invite modal for a specific account
    const accountId = searchParams.get('invite');
    if (accountId && accounts.length > 0) {
      const account = accounts.find(acc => acc._id === accountId);
      if (account) {
        setSelectedAccount(account);
        setShowInviteModal(true);
      }
    }
  }, [accounts, searchParams]);

  const fetchAccounts = async () => {
    try {
      console.log('SharedAccounts: Starting to fetch accounts...');
      console.log('SharedAccounts: Axios base URL:', axios.defaults.baseURL);
      console.log('SharedAccounts: Auth header:', axios.defaults.headers.common['Authorization']);
      
      setLoading(true);
      setError(''); // Clear previous errors
      const response = await axios.get('/shared-accounts');
      console.log('SharedAccounts: Successfully fetched accounts:', response.data);
      setAccounts(response.data);
    } catch (err: any) {
      console.error('SharedAccounts: Error fetching shared accounts:', err);
      console.error('SharedAccounts: Error response:', err.response);
      if (err.response?.status === 401) {
        setError('Please log in to view shared accounts');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please check your permissions.');
      } else {
        setError(`Failed to load shared accounts: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const memberIds = formData.memberIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id);

      // Filter out invites with no email (email is required for acceptance)
      const validInvites = invites.filter(
        invite => invite.recipientEmail.trim()
      );

      const response = await axios.post('/shared-accounts', {
        name: formData.name,
        memberIds,
        invites: validInvites.length > 0 ? validInvites : undefined
      });
      
      setFormData({ name: '', memberIds: '' });
      setInvites([]);
      setShowForm(false);
      fetchAccounts();
      
      if (validInvites.length > 0) {
        alert(`Shared account created and ${validInvites.length} invitation(s) sent!`);
      }
    } catch (err: any) {
      setError('Failed to create shared account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shared account?')) {
      return;
    }

    try {
      // Note: You might need to implement a DELETE endpoint in your backend
      setError('Delete functionality not implemented in backend yet');
    } catch (err: any) {
      setError('Failed to delete shared account');
    }
  };

  const handleInviteClick = (account: SharedAccount) => {
    setSelectedAccount(account);
    setShowInviteModal(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    
    setInviteSubmitting(true);
    setError('');

    try {
      await axios.post('/invites/send', {
        sharedAccountId: selectedAccount._id,
        recipientEmail: inviteFormData.recipientEmail || undefined,
        recipientPhone: inviteFormData.recipientPhone || undefined
      });
      
      setInviteFormData({ recipientEmail: '', recipientPhone: '' });
      setShowInviteModal(false);
      setSelectedAccount(null);
      
      // Show success message
      setError(''); // Clear any previous errors
      alert('Invitation sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleNavigateToInvitations = (account: SharedAccount) => {
    navigate(`/invitations?account=${account._id}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading shared accounts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Shared Accounts</h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Create Account'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <strong>Error:</strong> {error}
              {error.includes('log in') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <a href="/login" style={{ color: '#3182ce', textDecoration: 'underline' }}>
                    Click here to log in
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Account Form */}
      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Create New Shared Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Roommate Expenses, Family Budget"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Member IDs (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.memberIds}
                onChange={(e) => setFormData({ ...formData, memberIds: e.target.value })}
                placeholder="Leave empty for now - you can invite members later"
              />
            </div>

            {/* Invitations Section */}
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                Invite People (Optional)
              </label>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <p style={{ color: '#0369a1', fontSize: '0.9rem', margin: 0 }}>
                  <strong>💡 Tip:</strong> You can invite people now or later. Email is required for each invite (phone is optional).
                </p>
              </div>
              
              {invites.map((invite, index) => (
                <div key={index} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  background: '#f7fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#2d3748' }}>Invite #{index + 1}</strong>
                    <button
                      type="button"
                      onClick={() => setInvites(invites.filter((_, i) => i !== index))}
                      style={{
                        background: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        value={invite.recipientEmail}
                        onChange={(e) => {
                          const newInvites = [...invites];
                          newInvites[index].recipientEmail = e.target.value;
                          setInvites(newInvites);
                        }}
                        placeholder="friend@example.com"
                        style={{ fontSize: '0.9rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone (optional)</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={invite.recipientPhone}
                        onChange={(e) => {
                          const newInvites = [...invites];
                          newInvites[index].recipientPhone = e.target.value;
                          setInvites(newInvites);
                        }}
                        placeholder="+1234567890"
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => setInvites([...invites, { recipientEmail: '', recipientPhone: '' }])}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                + Add Another Invite
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? <span className="spinner"></span> : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Accounts List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your Shared Accounts</h2>
        
        {accounts.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No shared accounts yet. Create your first shared account above!
          </p>
        ) : (
          <div className="grid grid-2">
            {accounts.map((account) => (
              <div key={account._id} className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{account.name}</h3>
                  <button
                    onClick={() => handleDelete(account._id)}
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Members:</strong> {account.members.length}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Records:</strong> {account.financeRecords.length}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Created:</strong> {new Date(account.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}>
                    View Details
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleInviteClick(account)}
                  >
                    Quick Invite
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleNavigateToInvitations(account)}
                  >
                    Manage Invites
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ color: '#2b6cb0', marginBottom: '1rem' }}>📊 Total Accounts</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2b6cb0' }}>
            {accounts.length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>👥 Total Members</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            {accounts.reduce((sum, account) => sum + account.members.length, 0)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>📝 Total Records</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            {accounts.reduce((sum, account) => sum + account.financeRecords.length, 0)}
          </p>
        </div>
      </div>

      {/* Quick Invite Modal */}
      {showInviteModal && selectedAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '500px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Quick Invite</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedAccount(null);
                  setInviteFormData({ recipientEmail: '', recipientPhone: '' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#0369a1', margin: 0, fontSize: '0.9rem' }}>
                <strong>Inviting to:</strong> {selectedAccount.name}
              </p>
            </div>

            <form onSubmit={handleInviteSubmit}>
              <div className="form-group">
                <label className="form-label">Recipient Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={inviteFormData.recipientEmail}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, recipientEmail: e.target.value })}
                  placeholder="friend@example.com"
                  required={!inviteFormData.recipientPhone}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recipient Phone (optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  value={inviteFormData.recipientPhone}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, recipientPhone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                  <strong>💡 Note:</strong> At least one contact method (email or phone) is required to send an invitation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedAccount(null);
                    setInviteFormData({ recipientEmail: '', recipientPhone: '' });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviteSubmitting || (!inviteFormData.recipientEmail && !inviteFormData.recipientPhone)}
                  style={{ flex: 1 }}
                >
                  {inviteSubmitting ? <span className="spinner"></span> : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccounts;
