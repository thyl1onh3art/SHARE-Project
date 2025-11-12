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
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [inviteFormData, setInviteFormData] = useState({
    recipientEmail: '',
    recipientPhone: ''
  });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    memberIdsToRemove: [] as string[]
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showGroupPaymentModal, setShowGroupPaymentModal] = useState(false);
  const [groupPaymentData, setGroupPaymentData] = useState<any>(null);
  const [loadingGroupPayment, setLoadingGroupPayment] = useState(false);
  const [groupPaymentForm, setGroupPaymentForm] = useState({
    targetAmount: '',
    description: '',
    contributionAmount: '',
    merchantEmail: '',
    merchantName: ''
  });
  const [groupPaymentSubmitting, setGroupPaymentSubmitting] = useState(false);
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

      await axios.post('/shared-accounts', {
        name: formData.name,
        memberIds
      });
      
      setFormData({ name: '', memberIds: '' });
      setShowForm(false);
      fetchAccounts();
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
      setError('');
      await axios.delete(`/shared-accounts/${id}`);
      // Refresh the accounts list after successful deletion
      fetchAccounts();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete shared account';
      setError(errorMessage);
    }
  };

  const handleEditClick = (account: SharedAccount) => {
    setSelectedAccount(account);
    setEditFormData({
      name: account.name,
      memberIdsToRemove: []
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      setEditSubmitting(true);
      setError('');

      const updateData: any = {};
      
      // Update name if changed
      if (editFormData.name !== selectedAccount.name) {
        updateData.name = editFormData.name;
      }

      // Remove members if any selected
      if (editFormData.memberIdsToRemove.length > 0) {
        updateData.memberIds = editFormData.memberIdsToRemove;
        updateData.action = 'remove';
      }

      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        await axios.put(`/shared-accounts/${selectedAccount._id}`, updateData);
        setShowEditModal(false);
        fetchAccounts();
      } else {
        setShowEditModal(false);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update shared account';
      setError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setEditFormData(prev => ({
      ...prev,
      memberIdsToRemove: prev.memberIdsToRemove.includes(memberId)
        ? prev.memberIdsToRemove.filter(id => id !== memberId)
        : [...prev.memberIdsToRemove, memberId]
    }));
  };

  const handleViewDetails = async (accountId: string) => {
    try {
      setLoadingDetails(true);
      setError('');
      const response = await axios.get(`/shared-accounts/${accountId}`);
      setAccountDetails(response.data);
      setShowDetailsModal(true);
    } catch (err: any) {
      setError('Failed to load account details');
    } finally {
      setLoadingDetails(false);
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

  // Group Payment Handlers
  const handleGroupPaymentClick = async (account: SharedAccount) => {
    setSelectedAccount(account);
    setShowGroupPaymentModal(true);
    setLoadingGroupPayment(true);
    setError('');

    try {
      const response = await axios.get(`/group-payments/status/${account._id}`);
      if (response.data.hasGroupPayment) {
        setGroupPaymentData(response.data.groupPayment);
      } else {
        setGroupPaymentData(null);
      }
    } catch (err: any) {
      setError('Failed to load group payment status');
    } finally {
      setLoadingGroupPayment(false);
    }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setGroupPaymentSubmitting(true);
    setError('');

    try {
      await axios.post('/group-payments/set-target', {
        sharedAccountId: selectedAccount._id,
        targetAmount: parseFloat(groupPaymentForm.targetAmount),
        description: groupPaymentForm.description || `Group payment for ${selectedAccount.name}`
      });

      // Refresh group payment data
      const response = await axios.get(`/group-payments/status/${selectedAccount._id}`);
      setGroupPaymentData(response.data.groupPayment);
      setGroupPaymentForm({ ...groupPaymentForm, targetAmount: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set payment target');
    } finally {
      setGroupPaymentSubmitting(false);
    }
  };

  const handleCommitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setGroupPaymentSubmitting(true);
    setError('');

    try {
      await axios.post('/group-payments/commit', {
        sharedAccountId: selectedAccount._id,
        amount: parseFloat(groupPaymentForm.contributionAmount),
        description: 'My contribution'
      });

      // Refresh group payment data
      const response = await axios.get(`/group-payments/status/${selectedAccount._id}`);
      setGroupPaymentData(response.data.groupPayment);
      setGroupPaymentForm({ ...groupPaymentForm, contributionAmount: '' });
      alert('Contribution committed successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to commit contribution');
    } finally {
      setGroupPaymentSubmitting(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!selectedAccount) return;

    setGroupPaymentSubmitting(true);
    setError('');

    try {
      const response = await axios.post('/group-payments/create-payment', {
        sharedAccountId: selectedAccount._id,
        merchantEmail: groupPaymentForm.merchantEmail || undefined,
        merchantName: groupPaymentForm.merchantName || undefined
      });

      // Redirect to PayPal
      if (response.data.approvalUrl) {
        window.location.href = response.data.approvalUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create payment');
      setGroupPaymentSubmitting(false);
    }
  };

  const handleCancelGroupPayment = async () => {
    if (!selectedAccount) return;
    if (!window.confirm('Are you sure you want to cancel this group payment? All commitments will be cleared.')) {
      return;
    }

    setGroupPaymentSubmitting(true);
    setError('');

    try {
      await axios.post('/group-payments/cancel', {
        sharedAccountId: selectedAccount._id
      });

      setGroupPaymentData(null);
      setGroupPaymentForm({
        targetAmount: '',
        description: '',
        contributionAmount: '',
        merchantEmail: '',
        merchantName: ''
      });
      alert('Group payment cancelled successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel group payment');
    } finally {
      setGroupPaymentSubmitting(false);
    }
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
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '0.75rem',
                marginTop: '0.5rem'
              }}>
                <p style={{ color: '#0369a1', fontSize: '0.9rem', margin: 0 }}>
                  <strong>💡 Tip:</strong> You can create the account now and invite members later using the Invitations page. 
                  This makes it easier to share the account with friends and family.
                </p>
              </div>
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
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleViewDetails(account._id)}
                  >
                    View Details
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleEditClick(account)}
                  >
                    Edit
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
                  <button 
                    className="btn btn-success" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleGroupPaymentClick(account)}
                  >
                    💰 Group Payment
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

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
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
            maxWidth: '600px', 
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
              <h2 style={{ margin: 0 }}>Edit Shared Account</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAccount(null);
                  setEditFormData({ name: '', memberIdsToRemove: [] });
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

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  placeholder="Account name"
                />
              </div>

              {selectedAccount.members && selectedAccount.members.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Members (select to remove)</label>
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {selectedAccount.members.map((memberId: string) => {
                      const isOwner = memberId === selectedAccount.owner;
                      const isSelected = editFormData.memberIdsToRemove.includes(memberId);
                      return (
                        <div
                          key={memberId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            backgroundColor: isSelected ? '#fee2e2' : isOwner ? '#dbeafe' : 'transparent',
                            borderRadius: '4px',
                            cursor: isOwner ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => !isOwner && handleRemoveMember(memberId)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isOwner}
                            onChange={() => !isOwner && handleRemoveMember(memberId)}
                            style={{ marginRight: '0.5rem' }}
                          />
                          <span style={{ 
                            color: isOwner ? '#1e40af' : '#4a5568',
                            fontWeight: isOwner ? 'bold' : 'normal'
                          }}>
                            {memberId} {isOwner && '(Owner)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    💡 Note: The owner cannot be removed. Use invitations to add new members.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAccount(null);
                    setEditFormData({ name: '', memberIdsToRemove: [] });
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                  style={{ flex: 1 }}
                >
                  {editSubmitting ? <span className="spinner"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showDetailsModal && accountDetails && (
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
            maxWidth: '700px', 
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
              <h2 style={{ margin: 0 }}>Account Details: {accountDetails.name}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setAccountDetails(null);
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

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading details...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Account Information</h3>
                  <div style={{
                    background: '#f7fafc',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Name:</strong> {accountDetails.name}
                    </p>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Created:</strong> {new Date(accountDetails.createdAt).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Finance Records:</strong> {accountDetails.financeRecords?.length || 0}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Members ({accountDetails.members?.length || 0})</h3>
                  {accountDetails.members && accountDetails.members.length > 0 ? (
                    <div style={{
                      background: '#f7fafc',
                      padding: '1rem',
                      borderRadius: '6px'
                    }}>
                      {accountDetails.members.map((member: any, index: number) => {
                        const isOwner = member._id === accountDetails.owner || member === accountDetails.owner;
                        return (
                          <div
                            key={member._id || member || index}
                            style={{
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              backgroundColor: isOwner ? '#dbeafe' : 'white',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: isOwner ? 'bold' : 'normal' }}>
                              {member.email || member.firstName || member || 'Unknown'} {isOwner && '(Owner)'}
                            </p>
                            {member.firstName && (
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                                {member.firstName} {member.lastName}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#6b7280' }}>No members yet</p>
                  )}
                </div>

                {accountDetails.financeRecords && accountDetails.financeRecords.length > 0 && (
                  <div>
                    <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Finance Records ({accountDetails.financeRecords.length})</h3>
                    <div style={{
                      background: '#f7fafc',
                      padding: '1rem',
                      borderRadius: '6px',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      {accountDetails.financeRecords.map((record: any, index: number) => (
                        <div
                          key={record._id || index}
                          style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 'bold' }}>
                                {record.type === 'input' ? '💰 Income' : '💸 Expense'}
                              </p>
                              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                {record.description || 'No description'}
                              </p>
                              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                {new Date(record.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: record.type === 'input' ? '#38a169' : '#e53e3e'
                            }}>
                              {record.type === 'input' ? '+' : '-'}£{record.amount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setAccountDetails(null);
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Group Payment Modal */}
      {showGroupPaymentModal && selectedAccount && (
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
            maxWidth: '600px', 
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
              <h2 style={{ margin: 0 }}>Group Payment: {selectedAccount.name}</h2>
              <button
                onClick={() => {
                  setShowGroupPaymentModal(false);
                  setSelectedAccount(null);
                  setGroupPaymentData(null);
                  setGroupPaymentForm({
                    targetAmount: '',
                    description: '',
                    contributionAmount: '',
                    merchantEmail: '',
                    merchantName: ''
                  });
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

            {loadingGroupPayment ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading payment status...</p>
              </div>
            ) : (
              <>
                {!groupPaymentData ? (
                  // Set Target Form (Owner Only)
                  <div>
                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                        <strong>💡 How it works:</strong> Set a target amount (e.g., £100 for event tickets). 
                        Each member commits their share. When all committed, create a single PayPal payment.
                      </p>
                    </div>

                    <form onSubmit={handleSetTarget}>
                      <div className="form-group">
                        <label className="form-label">Target Amount (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={groupPaymentForm.targetAmount}
                          onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, targetAmount: e.target.value })}
                          required
                          placeholder="100.00"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                          type="text"
                          className="form-input"
                          value={groupPaymentForm.description}
                          onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, description: e.target.value })}
                          placeholder="e.g., Event tickets, Group dinner"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={groupPaymentSubmitting}
                        style={{ width: '100%' }}
                      >
                        {groupPaymentSubmitting ? <span className="spinner"></span> : 'Set Payment Target'}
                      </button>
                    </form>
                  </div>
                ) : (
                  // Group Payment Status
                  <div>
                    <div style={{
                      background: '#f0f9ff',
                      border: '1px solid #0ea5e9',
                      borderRadius: '6px',
                      padding: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ marginTop: 0, color: '#0369a1' }}>Payment Progress</h3>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Target:</span>
                          <strong>£{groupPaymentData.targetAmount.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Committed:</span>
                          <strong style={{ color: groupPaymentData.totalCommitted >= groupPaymentData.targetAmount ? '#38a169' : '#e53e3e' }}>
                            £{groupPaymentData.totalCommitted.toFixed(2)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Remaining:</span>
                          <strong>£{groupPaymentData.remaining.toFixed(2)}</strong>
                        </div>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '20px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          width: `${groupPaymentData.progress}%`,
                          height: '100%',
                          backgroundColor: groupPaymentData.totalCommitted >= groupPaymentData.targetAmount ? '#38a169' : '#0ea5e9',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <p style={{ margin: '0.5rem 0 0 0', textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                        {groupPaymentData.progress}% Complete
                      </p>
                    </div>

                    {groupPaymentData.description && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Description:</strong> {groupPaymentData.description}
                      </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>Contributions</h4>
                      {groupPaymentData.contributions && groupPaymentData.contributions.length > 0 ? (
                        <div style={{
                          background: '#f7fafc',
                          padding: '1rem',
                          borderRadius: '6px',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {groupPaymentData.contributions.map((contrib: any, idx: number) => (
                            <div key={idx} style={{
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              backgroundColor: 'white',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <strong>{contrib.userName || 'Unknown User'}</strong>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                  Committed {new Date(contrib.committedAt).toLocaleString()}
                                </p>
                              </div>
                              <strong style={{ color: '#38a169', fontSize: '1.1rem' }}>
                                £{contrib.amount.toFixed(2)}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#6b7280' }}>No contributions yet</p>
                      )}
                    </div>

                    {/* Commit Contribution Form */}
                    <form onSubmit={handleCommitContribution} style={{ marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Your Contribution (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={groupPaymentForm.contributionAmount}
                          onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, contributionAmount: e.target.value })}
                          required
                          placeholder="25.00"
                        />
                      </div>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={groupPaymentSubmitting}
                        style={{ width: '100%' }}
                      >
                        {groupPaymentSubmitting ? <span className="spinner"></span> : 'Commit Contribution'}
                      </button>
                    </form>

                    {/* Create Payment (Owner Only) */}
                    {groupPaymentData.totalCommitted >= groupPaymentData.targetAmount && (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '6px',
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <h4 style={{ marginTop: 0, color: '#166534' }}>✅ Ready to Pay!</h4>
                        <p style={{ color: '#166534', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                          All contributions are committed. You can now create the PayPal payment.
                        </p>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                          <label className="form-label">Merchant Email (Optional)</label>
                          <input
                            type="email"
                            className="form-input"
                            value={groupPaymentForm.merchantEmail}
                            onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, merchantEmail: e.target.value })}
                            placeholder="merchant@example.com"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Merchant Name (Optional)</label>
                          <input
                            type="text"
                            className="form-input"
                            value={groupPaymentForm.merchantName}
                            onChange={(e) => setGroupPaymentForm({ ...groupPaymentForm, merchantName: e.target.value })}
                            placeholder="Event Ticket Seller"
                          />
                        </div>

                        <button
                          onClick={handleCreatePayment}
                          className="btn btn-success"
                          disabled={groupPaymentSubmitting}
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          {groupPaymentSubmitting ? <span className="spinner"></span> : `Create Payment (£${groupPaymentData.targetAmount.toFixed(2)})`}
                        </button>
                      </div>
                    )}

                    {/* Cancel Payment (Owner Only) */}
                    {groupPaymentData.status === 'pending' && (
                      <button
                        onClick={handleCancelGroupPayment}
                        className="btn btn-danger"
                        disabled={groupPaymentSubmitting}
                        style={{ width: '100%' }}
                      >
                        {groupPaymentSubmitting ? <span className="spinner"></span> : 'Cancel Group Payment'}
                      </button>
                    )}

                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginTop: '1rem'
                    }}>
                      <p style={{ color: '#92400e', fontSize: '0.85rem', margin: 0 }}>
                        <strong>⚠️ Legal Note:</strong> This system tracks commitments (virtual), not actual money holding. 
                        When payment is created, the account owner will pay the full amount via PayPal. 
                        Money flows directly: Owner → PayPal → Merchant. We never hold funds.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowGroupPaymentModal(false);
                  setSelectedAccount(null);
                  setGroupPaymentData(null);
                  setGroupPaymentForm({
                    targetAmount: '',
                    description: '',
                    contributionAmount: '',
                    merchantEmail: '',
                    merchantName: ''
                  });
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccounts;
