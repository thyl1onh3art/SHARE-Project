import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface User {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  targetAmount?: number;
  targetDate?: string;
  perPersonAmount?: number;
  owner: string | User;
  members: string[] | User[];
  financeRecords: any[];
  createdAt: string;
}

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdowns, setCountdowns] = useState<{ [key: string]: { days: number; hours: number; minutes: number; seconds: number } }>({});
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);

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
    // Initialize countdowns immediately
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

    // Initialize immediately
    initializeCountdowns();

    // Update every second
    const timer = setInterval(initializeCountdowns, 1000);

    return () => clearInterval(timer);
  }, [accounts]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    memberIds: ''
  });
  const [invites, setInvites] = useState<Array<{ recipientEmail: string; recipientPhone: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: '',
    memberIdsToRemove: [] as string[]
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showGroupPaymentModal, setShowGroupPaymentModal] = useState(false);
  const [groupPaymentForm, setGroupPaymentForm] = useState({
    amount: '',
    description: '',
    merchantEmail: '',
    merchantName: ''
  });
  const [groupPaymentSubmitting, setGroupPaymentSubmitting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);
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
      
      // Log details about finance records for each account
      response.data.forEach((account: SharedAccount) => {
        console.log(`Account: ${account.name}`);
        console.log(`  Finance Records Count: ${account.financeRecords?.length || 0}`);
        if (account.financeRecords && account.financeRecords.length > 0) {
          account.financeRecords.forEach((record: any, index: number) => {
            if (typeof record === 'object' && record !== null) {
              console.log(`  Record ${index + 1}:`, {
                type: record.type,
                amount: record.amount,
                description: record.description,
                _id: record._id
              });
            } else {
              console.log(`  Record ${index + 1}: Not populated (ID only):`, record);
            }
          });
        }
      });
      
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

      await axios.post('/shared-accounts', {
        name: formData.name,
        description: formData.description,
        targetAmount: parseFloat(formData.targetAmount),
        targetDate: formData.targetDate,
        memberIds,
        invites: validInvites.length > 0 ? validInvites : undefined
      });
      
      setFormData({ name: '', description: '', targetAmount: '', targetDate: '', memberIds: '' });
      setInvites([]);
      setShowForm(false);
      fetchAccounts();
      
      if (validInvites.length > 0) {
        alert(`Shared account created and ${validInvites.length} invitation(s) sent!`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create shared account';
      setError(errorMessage);
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
      description: account.description || '',
      targetAmount: account.targetAmount?.toString() || '',
      targetDate: account.targetDate ? new Date(account.targetDate).toISOString().slice(0, 16) : '',
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

      // Update description if changed
      if (editFormData.description !== (selectedAccount.description || '')) {
        updateData.description = editFormData.description;
      }

      // Update target amount if changed
      if (editFormData.targetAmount && parseFloat(editFormData.targetAmount) !== (selectedAccount.targetAmount || 0)) {
        updateData.targetAmount = parseFloat(editFormData.targetAmount);
      }

      // Update target date if changed
      if (editFormData.targetDate) {
        const newDate = new Date(editFormData.targetDate).toISOString();
        const oldDate = selectedAccount.targetDate ? new Date(selectedAccount.targetDate).toISOString() : '';
        if (newDate !== oldDate) {
          updateData.targetDate = editFormData.targetDate;
        }
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

  const handleNavigateToInvitations = (account: SharedAccount) => {
    navigate(`/invitations?account=${account._id}`);
  };

  // Calculate balance for a shared account
  const calculateAccountBalance = (account: SharedAccount): number => {
    if (!account.financeRecords || account.financeRecords.length === 0) {
      console.log(`Balance calculation for ${account.name}: No finance records found`);
      return 0;
    }
    
    // Check if records are populated (objects) or just IDs (strings)
    const records = account.financeRecords.map((record: any) => {
      // If it's a string/ID, it wasn't populated - return null
      if (typeof record === 'string' || record instanceof String) {
        console.warn(`Balance calculation for ${account.name}: Record not populated, found ID:`, record);
        return null;
      }
      return record;
    }).filter((record: any) => record !== null);
    
    if (records.length === 0) {
      console.log(`Balance calculation for ${account.name}: No valid records after filtering`);
      return 0;
    }
    
    console.log(`Balance calculation for ${account.name}: Processing ${records.length} records`);
    
    const income = records
      .filter((record: any) => record && record.type === 'input')
      .reduce((sum: number, record: any) => {
        const amount = record.amount || 0;
        console.log(`  Income record: £${amount} - ${record.description}`);
        return sum + amount;
      }, 0);
    
    const expenses = records
      .filter((record: any) => record && record.type === 'output')
      .reduce((sum: number, record: any) => {
        const amount = record.amount || 0;
        console.log(`  Expense record: £${amount} - ${record.description}`);
        return sum + amount;
      }, 0);
    
    const balance = income - expenses;
    console.log(`Balance calculation for ${account.name}: Income £${income.toFixed(2)}, Expenses £${expenses.toFixed(2)}, Balance £${balance.toFixed(2)}`);
    return balance;
  };

  // Group Payment Handlers - Simplified to single payment
  const handleGroupPaymentClick = (account: SharedAccount) => {
    setSelectedAccount(account);
    setShowGroupPaymentModal(true);
    setGroupPaymentForm({
      amount: '', // Amount will be read-only and set to balance
      description: '',
      merchantEmail: '',
      merchantName: ''
    });
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setGroupPaymentSubmitting(true);
    setError('');

    // Calculate current balance - payment must exactly match this
    const currentBalance = calculateAccountBalance(selectedAccount);
    const paymentAmount = currentBalance; // Always use the exact balance

    // Check if account has any balance
    if (currentBalance <= 0) {
      setError('Account has no balance available for payment.');
      setGroupPaymentSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('/payments/create', {
        amount: paymentAmount,
        currency: 'GBP',
        description: groupPaymentForm.description || `Payment for ${selectedAccount.name}`,
        sharedAccountId: selectedAccount._id,
        merchantEmail: groupPaymentForm.merchantEmail || undefined,
        merchantName: groupPaymentForm.merchantName || undefined,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
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

  // Fetch personal balance (total balance from personal account)
  // NOTE: This uses the SAME calculation as Total Balance in FinancialRecords.tsx
  // Both filter out records with sharedAccount field to get only personal transactions
  const fetchPersonalBalance = async () => {
    try {
      setLoadingPersonalBalance(true);
      const personalRecordsResponse = await axios.get('/finance');
      // Filter out shared account records - only count personal transactions
      // This matches the logic in FinancialRecords.tsx for Total Balance calculation
      const personalRecords = personalRecordsResponse.data.filter((record: any) => !record.sharedAccount);
      const personalIncome = personalRecords
        .filter((record: any) => record.type === 'input')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const personalExpenses = personalRecords
        .filter((record: any) => record.type === 'output')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const balance = personalIncome - personalExpenses;
      console.log('Personal Account Balance calculated:', {
        totalRecords: personalRecordsResponse.data.length,
        personalRecords: personalRecords.length,
        income: personalIncome,
        expenses: personalExpenses,
        balance: balance
      });
      setPersonalBalance(balance);
    } catch (err: any) {
      console.error('Failed to fetch personal balance:', err);
      setPersonalBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  // Transfer Funds Handlers
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
      // Use the fetched personal balance, or fetch it if not available
      let currentBalance = personalBalance;
      if (currentBalance === null) {
        await fetchPersonalBalance();
        // Wait a moment for state to update, then check again
        const personalRecordsResponse = await axios.get('/finance');
        const personalRecords = personalRecordsResponse.data.filter((record: any) => !record.sharedAccount);
        const personalIncome = personalRecords
          .filter((record: any) => record.type === 'input')
          .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
        const personalExpenses = personalRecords
          .filter((record: any) => record.type === 'output')
          .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
        currentBalance = personalIncome - personalExpenses;
      }

      if (currentBalance !== null && amount > currentBalance) {
        setError(`Insufficient balance. Your current Personal Account balance is £${currentBalance.toFixed(2)}`);
        setTransferSubmitting(false);
        return;
      }

      const date = new Date().toISOString();
      const description = transferForm.description || `Transfer to ${selectedAccount.name}`;

      console.log('Transfer: Creating output record (personal account deduction)');
      // Create output record in personal account (deduct from personal)
      const outputRecord = await axios.post('/finance', {
        type: 'output',
        amount: amount,
        date: date,
        description: description
        // Don't include sharedAccount field - this is a personal account transaction
      });
      console.log('Transfer: Output record created:', outputRecord.data);

      console.log('Transfer: Creating input record (shared account addition)');
      // Create input record in shared account (add to shared account)
      const inputRecord = await axios.post('/finance', {
        type: 'input',
        amount: amount,
        date: date,
        description: description,
        sharedAccount: selectedAccount._id
      });
      console.log('Transfer: Input record created:', inputRecord.data);
      console.log('Transfer: Shared account ID:', selectedAccount._id);

      // Wait a moment for the backend to process and update the shared account
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh accounts to show updated balances
      console.log('Transfer: Refreshing accounts...');
      await fetchAccounts();
      await fetchPersonalBalance(); // Refresh personal balance after transfer
      
      console.log('Transfer: Successfully completed');
      setShowTransferModal(false);
      setTransferForm({ amount: '', description: '' });
      setSelectedAccount(null);
      setPersonalBalance(null);
    } catch (err: any) {
      console.error('Transfer error:', err);
      console.error('Transfer error response:', err.response);
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
              <label className="form-label">What is this account for? *</label>
              <textarea
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="e.g., Event tickets, Group vacation, Shared expenses"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Amount Needed (£) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                required
                min="0.01"
                step="0.01"
                placeholder="e.g., 100.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Date (when payment is needed) *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
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
            {accounts.map((account) => {
              const accountBalance = calculateAccountBalance(account);
              return (
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
                
                {/* Prominent Balance Display */}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    <div style={{
                      fontSize: '2.5rem',
                      opacity: 0.8
                    }}>
                      {accountBalance >= 0 ? '💰' : '💸'}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  {account.description && (
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                      <strong>Purpose:</strong> {account.description}
                    </p>
                  )}
                  {account.targetAmount !== undefined && (
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                      <strong>Target Amount:</strong> £{account.targetAmount.toFixed(2)}
                    </p>
                  )}
                  {account.perPersonAmount !== undefined && account.perPersonAmount > 0 && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <p 
                        style={{ 
                          color: '#2b6cb0', 
                          fontSize: '0.9rem', 
                          margin: '0.25rem 0', 
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted'
                        }}
                        onMouseEnter={() => setHoveredAccountId(account._id)}
                        onMouseLeave={() => setHoveredAccountId(null)}
                      >
                        <strong>Per Person:</strong> £{account.perPersonAmount.toFixed(2)} ({(Array.isArray(account.members) ? account.members.length : 0) + 1} participants)
                      </p>
                      {hoveredAccountId === account._id && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '0',
                          marginBottom: '5px',
                          padding: '0.75rem',
                          background: '#1a202c',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          zIndex: 1000,
                          minWidth: '200px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', borderBottom: '1px solid #4a5568', paddingBottom: '0.5rem' }}>
                            Participants:
                          </div>
                          <div style={{ marginBottom: '0.25rem' }}>
                            <span style={{ color: '#fbbf24' }}>Owner:</span>{' '}
                            {typeof account.owner === 'object' && account.owner ? (
                              <span>{account.owner.name || `${account.owner.firstName || ''} ${account.owner.lastName || ''}`.trim() || account.owner.email}</span>
                            ) : (
                              <span>You</span>
                            )}
                          </div>
                          {Array.isArray(account.members) && account.members.length > 0 && (
                            <div>
                              {account.members.map((member, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>
                                  <span style={{ color: '#60a5fa' }}>Member {idx + 1}:</span>{' '}
                                  {typeof member === 'object' && member ? (
                                    <span>{member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email}</span>
                                  ) : (
                                    <span>Member {idx + 1}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {account.targetDate && (
                    <div style={{ 
                      background: countdowns[account._id]?.days === 0 && countdowns[account._id]?.hours === 0 ? '#fee2e2' : '#f0f9ff',
                      border: `1px solid ${countdowns[account._id]?.days === 0 && countdowns[account._id]?.hours === 0 ? '#fca5a5' : '#bae6fd'}`,
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{ color: '#0369a1', fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                        Time Remaining:
                      </p>
                      {countdowns[account._id] ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Members:</strong> {account.members.length + 1} (including you)
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
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleTransferClick(account)}
                  >
                    Transfer Funds
                  </button>
                  <button 
                    className="btn btn-success" 
                    style={{ flex: 1, fontSize: '12px', padding: '6px 12px', minWidth: '80px' }}
                    onClick={() => handleGroupPaymentClick(account)}
                  >
                    Pay
                  </button>
                </div>
              </div>
            );
            })}
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
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Total Members</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            {accounts.reduce((sum, account) => sum + account.members.length, 0)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Total Records</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            {accounts.reduce((sum, account) => sum + account.financeRecords.length, 0)}
          </p>
        </div>
      </div>

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
                  setEditFormData({ name: '', description: '', targetAmount: '', targetDate: '', memberIdsToRemove: [] });
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

              <div className="form-group">
                <label className="form-label">What is this account for?</label>
                <textarea
                  className="form-input"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="e.g., Event tickets, Group vacation, Shared expenses"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount Needed (£)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editFormData.targetAmount}
                  onChange={(e) => setEditFormData({ ...editFormData, targetAmount: e.target.value })}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g., 100.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Changing this will recalculate the per-person amount based on current members.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Target Date (when payment is needed)</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editFormData.targetDate}
                  onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value })}
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
                    {Array.isArray(selectedAccount.members) && selectedAccount.members.map((member, index) => {
                      const memberId = typeof member === 'string' ? member : member._id;
                      const memberName = typeof member === 'object' && member 
                        ? (member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email)
                        : `Member ${index + 1}`;
                      const ownerId = typeof selectedAccount.owner === 'string' ? selectedAccount.owner : selectedAccount.owner._id;
                      const isOwner = memberId === ownerId;
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
                            {isOwner ? 'You (Owner)' : `Member: ${memberName}`}
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
                    setEditFormData({ name: '', description: '', targetAmount: '', targetDate: '', memberIdsToRemove: [] });
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
              <h2 style={{ margin: 0 }}>Payment: {selectedAccount.name}</h2>
              <button
                onClick={() => {
                  setShowGroupPaymentModal(false);
                  setSelectedAccount(null);
                  setGroupPaymentForm({
                    amount: '',
                    description: '',
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

            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                <strong>How it works:</strong> The payment amount is set to the exact account balance of £{selectedAccount ? calculateAccountBalance(selectedAccount).toFixed(2) : '0.00'}. You must pay this exact amount - no more, no less. You will be redirected to PayPal to complete the payment.
              </p>
            </div>

            {selectedAccount && calculateAccountBalance(selectedAccount) <= 0 && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #f87171',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: 0 }}>
                  <strong>No Balance Available:</strong> This account has no balance available for payment.
                </p>
              </div>
            )}

            <form onSubmit={handleCreatePayment}>
              <div className="form-group">
                <label className="form-label">Amount (£) - Fixed to Account Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={selectedAccount ? calculateAccountBalance(selectedAccount).toFixed(2) : '0.00'}
                  readOnly
                  required
                  disabled={!selectedAccount || calculateAccountBalance(selectedAccount) <= 0}
                  style={{
                    backgroundColor: '#f7fafc',
                    cursor: 'not-allowed',
                    fontWeight: 'bold',
                    color: '#2d3748'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Account Balance: £{selectedAccount ? calculateAccountBalance(selectedAccount).toFixed(2) : '0.00'}
                </p>
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

              <div className="form-group">
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

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupPaymentModal(false);
                    setSelectedAccount(null);
                    setGroupPaymentForm({
                      amount: '',
                      description: '',
                      merchantEmail: '',
                      merchantName: ''
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={groupPaymentSubmitting || !selectedAccount || calculateAccountBalance(selectedAccount) <= 0}
                  style={{ flex: 1 }}
                >
                  {groupPaymentSubmitting ? <span className="spinner"></span> : `Pay £${selectedAccount ? calculateAccountBalance(selectedAccount).toFixed(2) : '0.00'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
