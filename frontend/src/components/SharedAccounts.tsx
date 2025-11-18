import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SharedAccount {
  _id: string;
  name: string;
  financeRecords: any[];
}

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/shared-accounts');
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
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch personal balance (total balance from personal account)
  const fetchPersonalBalance = async () => {
    try {
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
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  /**
   * Transfer Funds Function
   * Transfers money from Personal Account (Total Balance) to a shared account
   * Creates two records:
   * 1. Output record in personal account (deducts from total balance)
   * 2. Input record in shared account (adds to shared account)
   */
  const transferFundsToSharedAccount = async (
    account: SharedAccount,
    amount: number,
    description?: string
  ): Promise<void> => {
    if (!account || !account._id) {
      throw new Error('Invalid shared account');
    }

    if (personalBalance !== null && amount > personalBalance) {
      throw new Error('Insufficient funds in your personal account');
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
    await new Promise(resolve => setTimeout(resolve, 500));
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

      {/* Accounts List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your Shared Accounts</h2>
        
        {accounts.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No shared accounts found.
          </p>
        ) : (
          <div className="grid grid-2">
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

                {/* Transaction History */}
                {account.financeRecords && account.financeRecords.length > 0 && (
                  <div style={{ 
                    marginTop: '1rem', 
                    marginBottom: '1rem',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '1rem'
                  }}>
                    <h4 style={{ 
                      fontSize: '0.95rem', 
                      fontWeight: 'bold', 
                      color: '#2d3748',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>Transaction History</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#718096' }}>
                        ({account.financeRecords.length} {account.financeRecords.length === 1 ? 'transaction' : 'transactions'})
                      </span>
                    </h4>
                    <div style={{
                      maxHeight: '300px',
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.5rem'
                    }}>
                      {account.financeRecords
                        .map((record: any) => {
                          // Handle both string IDs and full record objects
                          if (typeof record === 'string' || record instanceof String) {
                            return null;
                          }
                          return record;
                        })
                        .filter((record: any) => record !== null)
                        .sort((a: any, b: any) => {
                          const dateA = new Date(a.date || a.createdAt || 0).getTime();
                          const dateB = new Date(b.date || b.createdAt || 0).getTime();
                          return dateB - dateA; // Most recent first
                        })
                        .map((record: any, index: number) => {
                          const isInput = record.type === 'input';
                          const amount = record.amount || 0;
                          const date = record.date || record.createdAt;
                          const description = record.description || 'No description';
                          const user = record.user;
                          const userName = user 
                            ? (typeof user === 'object' 
                              ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email)
                              : 'User')
                            : 'Unknown';

                          return (
                            <div
                              key={record._id || index}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                backgroundColor: isInput ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${isInput ? '#bbf7d0' : '#fecaca'}`,
                                borderRadius: '4px',
                                borderLeft: `4px solid ${isInput ? '#38a169' : '#e53e3e'}`
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: isInput ? '#38a169' : '#e53e3e',
                                    backgroundColor: isInput ? '#d1fae5' : '#fee2e2',
                                    padding: '2px 6px',
                                    borderRadius: '3px'
                                  }}>
                                    {isInput ? 'IN' : 'OUT'}
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: 'bold',
                                    color: '#2d3748'
                                  }}>
                                    {isInput ? '+' : '-'}£{amount.toFixed(2)}
                                  </span>
                                </div>
                                <p style={{ 
                                  fontSize: '0.85rem', 
                                  color: '#4a5568',
                                  margin: '0.25rem 0',
                                  wordBreak: 'break-word'
                                }}>
                                  {description}
                                </p>
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '0.75rem',
                                  fontSize: '0.75rem',
                                  color: '#718096',
                                  marginTop: '0.25rem'
                                }}>
                                  <span>By: {userName}</span>
                                  {date && (
                                    <span>{new Date(date).toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {account.financeRecords.filter((r: any) => typeof r !== 'string' && !(r instanceof String)).length === 0 && (
                        <p style={{ 
                          textAlign: 'center', 
                          color: '#a0aec0', 
                          fontSize: '0.85rem',
                          padding: '1rem'
                        }}>
                          No transactions to display
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleEditClick(account)}
                  >
                    View/Edit Details
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleNavigateToInvitations(account)}
                  >
                    Manage Invites
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleTransferClick(account)}
                  >
                    Transfer Funds
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer Funds Modal */}
      {showTransferModal && selectedAccount && (
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
              <h2 style={{ margin: 0 }}>Transfer Funds to {selectedAccount.name}</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedAccount(null);
                  setTransferForm({ amount: '', description: '' });
                  setPersonalBalance(null);
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
            </div>

            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
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
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={transferSubmitting}
                  style={{ flex: 1 }}
                >
                  {transferSubmitting ? <span className="spinner"></span> : 'Transfer Funds'}
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
