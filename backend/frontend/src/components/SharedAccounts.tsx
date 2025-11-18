import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
<<<<<<< HEAD
=======
import { useNavigate, useSearchParams } from 'react-router-dom';
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)

interface SharedAccount {
  _id: string;
  name: string;
<<<<<<< HEAD
=======
  owner: string;
  members: string[];
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
  financeRecords: any[];
}

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
<<<<<<< HEAD
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);

  // Calculate balance for a shared account
  const calculateAccountBalance = (account: SharedAccount): number => {
    if (!account.financeRecords || account.financeRecords.length === 0) {
      return 0;
    }
    
    const records = account.financeRecords.map((record: any) => {
      if (typeof record === 'string' || record instanceof String) {
        return null;
      }
      return record;
    }).filter((record: any) => record !== null);
    
    if (records.length === 0) {
      return 0;
    }
    
    const income = records
      .filter((record: any) => record && record.type === 'input')
      .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    
    const expenses = records
      .filter((record: any) => record && record.type === 'output')
      .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    
    return income - expenses;
  };

  const fetchAccounts = useCallback(async () => {
=======
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
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
    try {
      setLoading(true);
      setError('');
      
      const timestamp = new Date().getTime();
      const response = await axios.get(`/shared-accounts?t=${timestamp}`);
      
      setAccounts(response.data);
    } catch (err: any) {
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
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);


  // Fetch personal balance (total balance from personal account)
  const fetchPersonalBalance = async () => {
    try {
<<<<<<< HEAD
      setLoadingPersonalBalance(true);
      const personalRecordsResponse = await axios.get('/finance');
      const personalRecords = personalRecordsResponse.data.filter((record: any) => !record.sharedAccount);
      const personalIncome = personalRecords
        .filter((record: any) => record.type === 'input')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const personalExpenses = personalRecords
        .filter((record: any) => record.type === 'output')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const balance = personalIncome - personalExpenses;
      setPersonalBalance(balance);
    } catch (err: any) {
      setPersonalBalance(null);
=======
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
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  /**
   * Transfer Funds Function
   * Transfers money from Personal Account (Total Balance) to a shared account
   */
  const transferFundsToSharedAccount = async (
    account: SharedAccount,
    amount: number,
    description?: string
  ): Promise<void> => {
    if (!account || !account._id) {
      throw new Error('Invalid shared account');
    }

<<<<<<< HEAD
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
=======
    try {
      // Note: You might need to implement a DELETE endpoint in your backend
      setError('Delete functionality not implemented in backend yet');
    } catch (err: any) {
      setError('Failed to delete shared account');
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
    }

<<<<<<< HEAD
    // Fetch current personal balance to verify sufficient funds
    const personalRecordsResponse = await axios.get('/finance');
    const personalRecords = personalRecordsResponse.data.filter((record: any) => !record.sharedAccount);
    const personalIncome = personalRecords
      .filter((record: any) => record.type === 'input')
      .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    const personalExpenses = personalRecords
      .filter((record: any) => record.type === 'output')
      .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    const currentPersonalBalance = personalIncome - personalExpenses;

    if (amount > currentPersonalBalance) {
      throw new Error(`Insufficient balance. Your current Personal Account balance is £${currentPersonalBalance.toFixed(2)}`);
    }

    const date = new Date().toISOString();
    const transferDescription = description || `Transfer to ${account.name}`;

    // Create output record in personal account (deduct from personal)
    await axios.post('/finance', {
      type: 'output',
      amount: amount,
      date: date,
      description: transferDescription
    });

    // Create input record in shared account (add to shared account)
    await axios.post('/finance', {
      type: 'input',
      amount: amount,
      date: date,
      description: transferDescription,
      sharedAccount: account._id
    });

    // Wait for backend to process and refresh accounts
    await new Promise(resolve => setTimeout(resolve, 1500));
    await fetchAccounts();
    await fetchPersonalBalance();
  };

  // Transfer Funds UI Handlers
  const handleTransferClick = async (account: SharedAccount) => {
    setSelectedAccount(account);
    setShowTransferModal(true);
    setTransferForm({
      amount: '',
      description: `Transfer to ${account.name}`
    });
    // Fetch personal balance when opening modal
    await fetchPersonalBalance();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setTransferSubmitting(true);
    setError('');

    try {
      await transferFundsToSharedAccount(
        selectedAccount,
        amount,
        transferForm.description || undefined
      );
      
      setShowTransferModal(false);
      setTransferForm({ amount: '', description: '' });
      setSelectedAccount(null);
      setPersonalBalance(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to transfer funds';
      setError(errorMessage);
    } finally {
      setTransferSubmitting(false);
    }
  };

=======
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

>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
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
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

<<<<<<< HEAD
=======
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

>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
      {/* Accounts List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your Shared Accounts</h2>
        
        {accounts.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No shared accounts found.
          </p>
        ) : (
          <div className="grid grid-2">
<<<<<<< HEAD
            {accounts.map((account) => {
              const accountBalance = calculateAccountBalance(account);
              return (
                <div key={account._id} className="card" style={{ margin: 0 }}>
                  <h3 style={{ margin: 0, marginBottom: '1rem' }}>{account.name}</h3>
                  
                  {/* Balance Display */}
                  <div style={{
                    background: accountBalance >= 0 
                      ? 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)' 
                      : 'linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 'normal' }}>
                        Account Balance
                      </p>
                      <p style={{ 
                        fontSize: '2rem', 
                        fontWeight: 'bold', 
                        margin: '0.25rem 0 0 0',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {accountBalance >= 0 ? '+' : ''}£{accountBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleTransferClick(account)}
                  >
                    Transfer Funds
=======
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
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* Transfer Funds Modal */}
      {showTransferModal && selectedAccount && (
=======
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
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
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
<<<<<<< HEAD
              <h2 style={{ margin: 0 }}>Transfer Funds to {selectedAccount.name}</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedAccount(null);
                  setTransferForm({ amount: '', description: '' });
                  setPersonalBalance(null);
=======
              <h2 style={{ margin: 0 }}>Quick Invite</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedAccount(null);
                  setInviteFormData({ recipientEmail: '', recipientPhone: '' });
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
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
<<<<<<< HEAD
            </div>

            {/* Personal Account Balance Display */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                  Personal Account (Total Balance)
                </h3>
                {loadingPersonalBalance && (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                )}
              </div>
              {personalBalance !== null ? (
                <p style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold', 
                  margin: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  £{personalBalance.toFixed(2)}
                </p>
              ) : (
                <p style={{ fontSize: '1rem', margin: 0, opacity: 0.8 }}>
                  Unable to load balance
                </p>
              )}
              <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                This is your total balance from your personal account
              </p>
=======
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
            </div>

            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
<<<<<<< HEAD
              <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                <strong>How it works:</strong> This will transfer funds from your <strong>Personal Account (Total Balance)</strong> to this shared account. The amount will be deducted from your personal balance and added to the shared account balance.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="form-group">
                <label className="form-label">Amount to Transfer (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={personalBalance !== null ? personalBalance : undefined}
                  className="form-input"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Enter the amount you want to transfer from your <strong>Personal Account</strong> to this shared account.
                  {personalBalance !== null && personalBalance > 0 && (
                    <span style={{ display: 'block', marginTop: '0.25rem', color: '#667eea', fontWeight: 'bold' }}>
                      Available: £{personalBalance.toFixed(2)}
                    </span>
                  )}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  placeholder="e.g., Transfer to shared account"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedAccount(null);
                    setTransferForm({ amount: '', description: '' });
                    setPersonalBalance(null);
=======
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
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
<<<<<<< HEAD
                  disabled={transferSubmitting}
                  style={{ flex: 1 }}
                >
                  {transferSubmitting ? <span className="spinner"></span> : 'Transfer Funds'}
=======
                  disabled={inviteSubmitting || (!inviteFormData.recipientEmail && !inviteFormData.recipientPhone)}
                  style={{ flex: 1 }}
                >
                  {inviteSubmitting ? <span className="spinner"></span> : 'Send Invitation'}
>>>>>>> 2c89d1e (Add transfer funds functionality from total balance to shared accounts)
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
