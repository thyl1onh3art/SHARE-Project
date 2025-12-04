import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  targetAmount?: number;
  targetDate?: string;
  perPersonAmount?: number;
  owner: string | { _id: string; firstName?: string; lastName?: string; email: string };
  members: string[] | Array<{ _id: string; firstName?: string; lastName?: string; email: string }>;
  financeRecords: any[];
  createdAt?: string;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [countdowns, setCountdowns] = useState<{ [key: string]: { days: number; hours: number; minutes: number; seconds: number } }>({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);
  const navigate = useNavigate();

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


  // Calculate countdown timer
  const calculateCountdown = (targetDate: string | undefined): { days: number; hours: number; minutes: number; seconds: number } | null => {
    if (!targetDate) return null;
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  };

  // Initialize and update countdowns every second
  useEffect(() => {
    const initializeCountdowns = () => {
      const newCountdowns: { [key: string]: { days: number; hours: number; minutes: number; seconds: number } } = {};
      accounts.forEach(account => {
        if (account.targetDate) {
          const countdown = calculateCountdown(account.targetDate);
          if (countdown) {
            newCountdowns[account._id] = countdown;
          }
        }
      });
      setCountdowns(newCountdowns);
    };

    initializeCountdowns();
    const timer = setInterval(initializeCountdowns, 1000);

    return () => clearInterval(timer);
  }, [accounts]);

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

  // Edit Account Handlers
  const handleEditClick = (account: SharedAccount) => {
    setSelectedAccount(account);
    setEditForm({
      name: account.name,
      description: account.description || '',
      targetAmount: account.targetAmount?.toString() || '',
      targetDate: account.targetDate ? new Date(account.targetDate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const handleNavigateToInvitations = (account: SharedAccount) => {
    navigate(`/invitations?account=${account._id}`);
  };

  // Calculate participant count for an account (owner + members who accepted invitations)
  const getParticipantCount = (account: SharedAccount): number => {
    // Get owner ID
    const ownerId = typeof account.owner === 'string' ? account.owner : account.owner?._id;
    const ownerIdStr = ownerId?.toString();
    
    // Count members (people who accepted invitations and joined)
    const memberArray = Array.isArray(account.members) ? account.members : [];
    const uniqueMembers = new Set<string>();
    
    // Add owner if not null
    if (ownerIdStr) {
      uniqueMembers.add(ownerIdStr);
    }
    
    // Add all members (these are people who accepted invitations)
    memberArray.forEach((member: any) => {
      const memberId = typeof member === 'string' ? member : member?._id;
      if (memberId) {
        uniqueMembers.add(memberId.toString());
      }
    });
    
    // The participant count is: owner (1) + all members (who accepted and joined)
    // This represents the total number of people who are part of the shared account
    return uniqueMembers.size;
  };

  // Get list of participant names for an account
  const getParticipantNames = (account: SharedAccount): string[] => {
    const names: string[] = [];
    
    // Get owner name
    if (typeof account.owner === 'object' && account.owner) {
      const ownerName = account.owner.firstName && account.owner.lastName
        ? `${account.owner.firstName} ${account.owner.lastName}`
        : account.owner.email || 'Owner';
      names.push(ownerName);
    }
    
    // Get member names
    const memberArray = Array.isArray(account.members) ? account.members : [];
    memberArray.forEach((member: any) => {
      if (typeof member === 'object' && member) {
        const memberName = member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`
          : member.email || 'Member';
        names.push(memberName);
      }
    });
    
    return names;
  };

  const handlePayClick = (account: SharedAccount) => {
    const balance = calculateAccountBalance(account);
    if (balance <= 0) {
      setError('No balance to pay. The shared account balance is £0.00 or negative.');
      return;
    }
    setSelectedAccount(account);
    setShowPayModal(true);
    fetchPersonalBalance();
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const balance = calculateAccountBalance(selectedAccount);
    if (balance <= 0) {
      setError('No balance to pay. The shared account balance is £0.00 or negative.');
      return;
    }

    if (personalBalance !== null && balance > personalBalance) {
      setError('Insufficient funds in your personal account to pay the full balance.');
      return;
    }

    setPaySubmitting(true);
    setError('');

    try {
      // Pay the full balance - create output record in shared account (deduct from shared account)
      await axios.post('/finance', {
        type: 'output',
        amount: balance,
        date: new Date().toISOString(),
        description: `Full payment for ${selectedAccount.name}`,
        sharedAccount: selectedAccount._id
      });

      // Wait for backend to process and refresh accounts
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchAccounts();
      await fetchPersonalBalance();
      
      setShowPayModal(false);
      setSelectedAccount(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to process payment';
      setError(errorMessage);
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleDeleteClick = (account: SharedAccount) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedAccount) return;

    setDeleteSubmitting(true);
    setError('');

    try {
      await axios.delete(`/shared-accounts/${selectedAccount._id}`);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      await fetchAccounts();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete shared account';
      setError(errorMessage);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setEditSubmitting(true);
    setError('');

    try {
      const updateData: any = {};
      
      if (editForm.name !== selectedAccount.name) {
        updateData.name = editForm.name;
      }
      if (editForm.description !== (selectedAccount.description || '')) {
        updateData.description = editForm.description;
      }
      if (editForm.targetAmount && parseFloat(editForm.targetAmount) !== (selectedAccount.targetAmount || 0)) {
        updateData.targetAmount = parseFloat(editForm.targetAmount);
      }
      if (editForm.targetDate) {
        const newDate = new Date(editForm.targetDate).toISOString();
        const oldDate = selectedAccount.targetDate ? new Date(selectedAccount.targetDate).toISOString() : '';
        if (newDate !== oldDate) {
          updateData.targetDate = editForm.targetDate;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await axios.put(`/shared-accounts/${selectedAccount._id}`, updateData);
        setShowEditModal(false);
        setSelectedAccount(null);
        await fetchAccounts();
      } else {
        setShowEditModal(false);
        setSelectedAccount(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update shared account';
      setError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
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
              const balance = calculateAccountBalance(account);
              const participantCount = getParticipantCount(account);
              return (
                <div key={account._id} className="card" style={{ margin: 0 }}>
                  {/* Account Details */}
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                      <strong>Purpose:</strong> {account.description || account.name}
                    </p>
                    {account.targetAmount !== undefined && account.targetAmount > 0 && (
                      <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                        <strong>Target Amount:</strong> £{account.targetAmount.toFixed(2)}
                      </p>
                    )}
                    {account.perPersonAmount !== undefined && account.perPersonAmount > 0 && (
                      <p style={{ 
                        color: '#2b6cb0', 
                        fontSize: '0.9rem', 
                        margin: '0.25rem 0', 
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                        textUnderlineOffset: '2px'
                      }}>
                        <strong>Per Person:</strong> £{account.perPersonAmount.toFixed(2)}
                      </p>
                    )}
                    <p style={{ 
                      color: '#2b6cb0', 
                      fontSize: '0.9rem', 
                      margin: '0.25rem 0', 
                      fontWeight: 'bold'
                    }}>
                      <strong>Balance:</strong> £{balance.toFixed(2)}
                    </p>
                    {account.targetDate && (
                      <div style={{ 
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        padding: '0.75rem',
                        marginTop: '0.5rem'
                      }}>
                        <p style={{ color: '#0369a1', fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                          Time Remaining:
                        </p>
                        {countdowns[account._id] ? (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {countdowns[account._id].days > 0 && (
                              <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                                {countdowns[account._id].days}d
                              </span>
                            )}
                            <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                              {countdowns[account._id].hours}h
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                              {countdowns[account._id].minutes}m
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                              {countdowns[account._id].seconds}s
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>Calculating...</span>
                        )}
                        <p style={{ color: '#0369a1', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                          Target: {new Date(account.targetDate).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div 
                      style={{ 
                        color: '#4a5568', 
                        fontSize: '0.9rem', 
                        margin: '0.25rem 0',
                        position: 'relative',
                        display: 'inline-block'
                      }}
                      onMouseEnter={() => setHoveredAccountId(account._id)}
                      onMouseLeave={() => setHoveredAccountId(null)}
                    >
                      <strong>Participants:</strong>{' '}
                      <span style={{ 
                        cursor: 'pointer', 
                        textDecoration: 'underline',
                        textDecorationStyle: 'dotted',
                        color: '#2b6cb0'
                      }}>
                        {participantCount} {participantCount === 1 ? 'person' : 'people'} (invited and accepted)
                      </span>
                      {hoveredAccountId === account._id && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          marginBottom: '8px',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          zIndex: 1000,
                          minWidth: '200px',
                          maxWidth: '300px'
                        }}>
                          <div style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: '#2d3748',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '6px'
                          }}>
                            Participants:
                          </div>
                          <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: 0
                          }}>
                            {getParticipantNames(account).map((name, index) => (
                              <li key={index} style={{
                                padding: '4px 0',
                                fontSize: '0.85rem',
                                color: '#4a5568'
                              }}>
                                • {name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                      <strong>Records:</strong> {account.financeRecords?.length || 0}
                    </p>
                    {account.createdAt && (
                      <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                        <strong>Created:</strong> {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                {/* Action Buttons Section */}
                <div style={{ 
                  marginTop: '1.5rem', 
                  paddingTop: '1rem', 
                  borderTop: '2px solid #e2e8f0' 
                }}>
                  <h4 style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '600', 
                    color: '#2d3748', 
                    marginBottom: '0.75rem',
                    textAlign: 'center'
                  }}>
                    Account Actions
                  </h4>
                  
                  {/* Primary Actions Row */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '0.5rem', 
                    marginBottom: '0.5rem' 
                  }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ 
                        fontSize: '13px', 
                        padding: '10px 12px', 
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                      onClick={() => handleEditClick(account)}
                      title="View and edit account details"
                    >
                      <span>📝</span> View/Edit Details
                    </button>
                    <button 
                      className="btn btn-outline" 
                      style={{ 
                        fontSize: '13px', 
                        padding: '10px 12px', 
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                      onClick={() => handleNavigateToInvitations(account)}
                      title="Manage invitations for this account"
                    >
                      <span>👥</span> Manage Invites
                    </button>
                  </div>

                  {/* Secondary Actions Row */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '0.5rem', 
                    marginBottom: '0.5rem' 
                  }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ 
                        fontSize: '13px', 
                        padding: '10px 12px', 
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}
                      onClick={() => handleTransferClick(account)}
                      title="Transfer funds from personal account to this shared account"
                    >
                      <span>💸</span> Transfer Funds
                    </button>
                    <button 
                      className="btn btn-success" 
                      style={{ 
                        fontSize: '13px', 
                        padding: '10px 12px', 
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        opacity: balance <= 0 ? 0.6 : 1,
                        cursor: balance <= 0 ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => handlePayClick(account)}
                      disabled={balance <= 0}
                      title={balance <= 0 ? "No balance to pay" : `Pay full balance of £${balance.toFixed(2)}`}
                    >
                      <span>💳</span> Pay Full Balance
                    </button>
                  </div>

                  {/* Delete Action - Full Width */}
                  <button 
                    className="btn btn-danger" 
                    style={{ 
                      width: '100%', 
                      fontSize: '13px', 
                      padding: '10px 12px', 
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      marginTop: '0.5rem'
                    }}
                    onClick={() => handleDeleteClick(account)}
                    title="Permanently delete this shared account"
                  >
                    <span>🗑️</span> Delete Account
                  </button>
                </div>
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
                  setEditForm({ name: '', description: '', targetAmount: '', targetDate: '' });
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
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  placeholder="Account name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="What is this account for?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (£)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g., 100.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  The total amount needed for this shared account.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editForm.targetDate}
                  onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  When is this payment needed?
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAccount(null);
                    setEditForm({ name: '', description: '', targetAmount: '', targetDate: '' });
                  }}
                  className="btn btn-secondary"
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

      {/* Pay Full Balance Modal */}
      {showPayModal && selectedAccount && (
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
              <h2 style={{ margin: 0 }}>Pay Full Balance</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedAccount(null);
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

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                Shared Account: {selectedAccount.name}
              </h3>
              <p style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                margin: '0.5rem 0 0 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                £{calculateAccountBalance(selectedAccount).toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                This is the full balance that will be paid from this shared account
              </p>
            </div>

            {personalBalance !== null && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                  <strong>Your Personal Balance:</strong> £{personalBalance.toFixed(2)}
                </p>
              </div>
            )}

            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: 0 }}>
                <strong>⚠️ Important:</strong> This will pay the FULL balance (£{calculateAccountBalance(selectedAccount).toFixed(2)}) from the shared account. This action cannot be undone. The full amount will be deducted from the shared account balance.
              </p>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedAccount(null);
                    setPersonalBalance(null);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={paySubmitting || calculateAccountBalance(selectedAccount) <= 0}
                  style={{ flex: 1 }}
                >
                  {paySubmitting ? <span className="spinner"></span> : 'Pay Full Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && selectedAccount && (
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
              <h2 style={{ margin: 0, color: '#dc2626' }}>Delete Shared Account</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
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
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#991b1b', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                ⚠️ Warning: This action cannot be undone!
              </p>
              <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: 0 }}>
                You are about to delete the shared account <strong>"{selectedAccount.name}"</strong>. All finance records associated with this account will be removed from the account (but may remain in your personal records). This action is permanent.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="btn btn-danger"
                disabled={deleteSubmitting}
                style={{ flex: 1 }}
              >
                {deleteSubmitting ? <span className="spinner"></span> : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccounts;
