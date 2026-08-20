import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface FinanceRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  date: string;
  description?: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  financeRecords: FinanceRecord[];
  targetAmount?: number;
  targetDate?: string;
  createdAt: string;
}

const SharedAccountDetail: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState<SharedAccount | null>(null);
  const [transactions, setTransactions] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [availableWithdrawal, setAvailableWithdrawal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch account details
      const accountResponse = await axios.get(`/shared-accounts/${accountId}`);
      const accountData = accountResponse.data;

      // Fetch all finance records for this account
      const recordsResponse = await axios.get(`/finance?sharedAccount=${accountId}`);
      const records = recordsResponse.data;

      // Populate user details for each record
      const populatedRecords = await Promise.all(
        records.map(async (record: any) => {
          try {
            const userResponse = await axios.get(`/users/${record.user}`);
            return {
              ...record,
              user: userResponse.data
            };
          } catch {
            return {
              ...record,
              user: { _id: record.user, firstName: 'Unknown', lastName: 'User', email: '' }
            };
          }
        })
      );

      setAccount(accountData);
      setTransactions(populatedRecords.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = () => {
    return (user as any)?._id || (user as any)?.id || '';
  };

  const calculateBalance = () => {
    if (!transactions.length) return 0;
    return transactions.reduce((sum, record) => {
      return sum + (record.type === 'input' ? record.amount : -record.amount);
    }, 0);
  };

  const calculateUserContribution = (userId: string) => {
    return transactions
      .filter(record => record.user._id === userId && record.type === 'input')
      .reduce((sum, record) => sum + record.amount, 0);
  };

  const calculateAvailableWithdrawal = (userId: string) => {
    const contributions = transactions
      .filter(record => record.user._id === userId && record.type === 'input')
      .reduce((sum, record) => sum + record.amount, 0);
    
    const withdrawals = transactions
      .filter(record => record.user._id === userId && record.type === 'output')
      .reduce((sum, record) => sum + record.amount, 0);
    
    return Math.max(0, contributions - withdrawals);
  };

  useEffect(() => {
    if (user && transactions.length > 0) {
      const userId = getCurrentUserId();
      const available = calculateAvailableWithdrawal(userId);
      setAvailableWithdrawal(available);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactions]);

  const handleWithdrawClick = () => {
    if (user) {
      const userId = getCurrentUserId();
      const available = calculateAvailableWithdrawal(userId);
      setAvailableWithdrawal(available);
      setWithdrawAmount(available.toFixed(2));
      setShowWithdrawModal(true);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !withdrawAmount) return;

    setWithdrawSubmitting(true);
    setError('');

    try {
      await axios.post(`/shared-accounts/${accountId}/withdraw`, {
        amount: parseFloat(withdrawAmount),
        description: withdrawDescription || undefined
      });

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawDescription('');
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reverse recorded contribution');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

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
      setPersonalBalance(personalIncome - personalExpenses);
    } catch {
      setPersonalBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  const handleEditClick = () => {
    if (!account) return;
    setEditForm({
      name: account.name || '',
      description: account.description || '',
      targetAmount: account.targetAmount ? account.targetAmount.toString() : '',
      targetDate: account.targetDate ? new Date(account.targetDate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    setEditSubmitting(true);
    setError('');

    try {
      const updateData: any = {};
      if (editForm.name.trim()) updateData.name = editForm.name.trim();
      if (editForm.description.trim()) updateData.description = editForm.description.trim();
      if (editForm.targetAmount) updateData.targetAmount = parseFloat(editForm.targetAmount);
      if (editForm.targetDate) updateData.targetDate = new Date(editForm.targetDate).toISOString();

      await axios.put(`/shared-accounts/${accountId}`, updateData);
      setShowEditModal(false);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account details');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTransferClick = async () => {
    setTransferForm({ amount: '', description: '' });
    setError('');
    setShowTransferModal(true);
    await fetchPersonalBalance();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !accountId) return;

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (personalBalance !== null && amount > personalBalance) {
      setError('Amount exceeds your personal tracked total');
      return;
    }

    if (account.targetAmount && account.targetAmount > 0) {
      const currentBalance = calculateBalance();
      const newBalance = currentBalance + amount;
      if (newBalance > account.targetAmount) {
        const remaining = account.targetAmount - currentBalance;
        setError(
          `Contribution would exceed the target of £${account.targetAmount.toFixed(2)}. ` +
          `Maximum you can record now: £${remaining.toFixed(2)}`
        );
        return;
      }
    }

    setTransferSubmitting(true);
    setError('');
    const date = new Date().toISOString();
    const transferDescription = transferForm.description || `Contribution to ${account.name}`;

    try {
      await axios.post('/finance', {
        type: 'output',
        amount,
        date,
        description: transferDescription
      });
      await axios.post('/finance', {
        type: 'input',
        amount,
        date,
        description: transferDescription,
        sharedAccount: accountId
      });
      setShowTransferModal(false);
      setTransferForm({ amount: '', description: '' });
      await fetchAccountDetails();
      await fetchPersonalBalance();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record contribution');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handlePayClick = async () => {
    setError('');
    setShowPayModal(true);
    await fetchPersonalBalance();
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !accountId) return;

    const balance = calculateBalance();
    if (balance <= 0) {
      setError('Nothing recorded to settle. The tracked total for this trip pot is £0.00 or less.');
      return;
    }

    if (personalBalance !== null && balance > personalBalance) {
      setError('Your personal tracked total is lower than the amount to settle.');
      return;
    }

    setPaySubmitting(true);
    setError('');

    try {
      await axios.post('/payment-requests', {
        sharedAccountId: accountId,
        amount: balance,
        description: `Settlement record for ${account.name}`
      });
      setShowPayModal(false);
      alert('Settlement request created. All travellers will be notified and must approve before the ledger settlement is recorded. SHARE does not send bank payments.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create settlement request');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleRemoveAccount = async () => {
    if (!account || !accountId) return;
    const currentUserId = getCurrentUserId();
    const ownerId = typeof account.owner === 'object' ? account.owner._id : account.owner;
    const isOwner = ownerId === currentUserId;

    if (isOwner && !newOwnerId) {
      setError('Please select a new owner before removing this account.');
      return;
    }

    setRemoveSubmitting(true);
    setError('');

    try {
      if (isOwner) {
        await axios.post(`/shared-accounts/${accountId}/transfer-ownership`, {
          newOwnerId,
          removeCurrentOwner: true
        });
      } else {
        await axios.post('/invites/remove-member', {
          sharedAccountId: accountId,
          memberId: currentUserId
        });
      }
      navigate('/shared-accounts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove account');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading account details...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="card">
        <p style={{ color: '#e53e3e' }}>{error || 'Account not found'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/shared-accounts')}>
          Back to Trip Money
        </button>
      </div>
    );
  }

  const userId = user ? getCurrentUserId() : '';
  const userContribution = user ? calculateUserContribution(userId) : 0;
  const allParticipants = [account.owner, ...account.members];
  const ownerId = typeof account.owner === 'object' ? account.owner._id : account.owner;
  const isOwner = ownerId === userId;
  const last24HoursCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    return Number.isFinite(transactionTime) && transactionTime >= last24HoursCutoff;
  });

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/shared-accounts')}>
          ← Back to Trip Money
        </button>
        <h1 style={{ margin: 0 }}>{account.name}</h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Account Summary */}
      <div className="card" style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <button
          onClick={() => setShowRemoveModal(true)}
          aria-label="Remove shared trip costs"
          title="Remove shared trip costs"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'transparent',
            border: 'none',
            color: '#e53e3e',
            fontSize: '1.25rem',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          ×
        </button>
        <h2 className="card-title">Trip money summary</h2>
        {account.description && (
          <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
            <strong>What this is for:</strong> {account.description}
          </p>
        )}
        
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          color: '#4a5568',
          fontSize: '0.9rem'
        }}>
          SHARE records and coordinates group contributions. It does not hold this tracked amount in a SHARE bank account.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Recorded total</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
              £{calculateBalance().toFixed(2)}
            </p>
          </div>
          {account.targetAmount && (
            <div>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Contribution target</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
                £{account.targetAmount.toFixed(2)}
              </p>
            </div>
          )}
          <div>
            <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Travellers</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
              {allParticipants.length}
            </p>
          </div>
          {user && (
            <>
              <div>
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Your contribution</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
                  £{userContribution.toFixed(2)}
                </p>
              </div>
              <div>
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Available to reverse (recorded)</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38a169', margin: '0.25rem 0 0 0' }}>
                  £{availableWithdrawal.toFixed(2)}
                </p>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            <strong>Owner:</strong> {account.owner.firstName} {account.owner.lastName} ({account.owner.email})
          </p>
          {account.members.length > 0 && (
            <div>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                <strong>Members:</strong>
              </p>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                {account.members.map((member) => (
                  <li key={member._id} style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                    {member.firstName} {member.lastName} ({member.email})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleEditClick}>
              Edit / View Details
            </button>
          <button className="btn btn-primary" onClick={handleTransferClick}>
            Record contribution
          </button>
            <button className="btn btn-success" onClick={handlePayClick}>
              Request settlement
            </button>
          </div>
        </div>

        {/* Reverse contribution */}
        {user && availableWithdrawal > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <button
              className="btn btn-success"
              onClick={handleWithdrawClick}
              style={{ width: '100%' }}
            >
              Reverse recorded contribution (£{availableWithdrawal.toFixed(2)} available)
            </button>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="card">
        <h2 className="card-title">Transaction History (Last 24 Hours)</h2>
        <p style={{ color: '#4a5568', fontSize: '0.9rem', marginTop: '-0.25rem' }}>
          Showing {recentTransactions.length} of {transactions.length} total transaction{transactions.length !== 1 ? 's' : ''}. Full history will be available in Account Settings.
        </p>
        {transactions.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No transactions yet.</p>
        ) : recentTransactions.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No transactions in the last 24 hours.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#4a5568', fontWeight: '600' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {new Date(transaction.date).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        background: transaction.type === 'input' ? '#c6f6d5' : '#fed7d7',
                        color: transaction.type === 'input' ? '#22543d' : '#742a2a'
                      }}>
                        {transaction.type === 'input' ? 'Contribution' : 'Cost / reverse'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {transaction.description || 'No description'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {transaction.user.firstName} {transaction.user.lastName}
                    </td>
                    <td style={{ 
                      padding: '0.75rem', 
                      textAlign: 'right',
                      fontWeight: '600',
                      color: transaction.type === 'input' ? '#38a169' : '#e53e3e'
                    }}>
                      {transaction.type === 'input' ? '+' : '-'}£{transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Details Modal */}
      {showEditModal && (
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
            maxWidth: '520px', 
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
              <h2 style={{ margin: 0 }}>Edit / View Details</h2>
              <button
                onClick={() => setShowEditModal(false)}
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

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editForm.targetDate}
                  onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

      {/* Transfer Payment Modal */}
      {showTransferModal && (
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
            maxWidth: '520px', 
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
              <h2 style={{ margin: 0 }}>Record contribution</h2>
              <button
                onClick={() => setShowTransferModal(false)}
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

            {loadingPersonalBalance ? (
              <p style={{ color: '#4a5568' }}>Loading personal tracked total...</p>
            ) : personalBalance !== null ? (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                Personal tracked total: <strong>£{personalBalance.toFixed(2)}</strong>
              </p>
            ) : (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                Personal tracked total unavailable.
              </p>
            )}
            <p style={{ color: '#4a5568', fontSize: '0.85rem' }}>
              This updates the group ledger only — SHARE does not move bank funds.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleTransferSubmit}>
              <div className="form-group">
                <label className="form-label">Contribution amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  placeholder="e.g., Accommodation deposit share"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
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
                  {transferSubmitting ? <span className="spinner"></span> : 'Record contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
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
            maxWidth: '520px', 
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
              <h2 style={{ margin: 0 }}>Request settlement record</h2>
              <button
                onClick={() => setShowPayModal(false)}
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

            <p style={{ color: '#4a5568', marginTop: 0 }}>
              Settlement amount to record: <strong>£{calculateBalance().toFixed(2)}</strong>
            </p>

            {loadingPersonalBalance ? (
              <p style={{ color: '#4a5568' }}>Loading personal tracked total...</p>
            ) : personalBalance !== null ? (
              <p style={{ color: '#4a5568' }}>
                Personal tracked total: <strong>£{personalBalance.toFixed(2)}</strong>
              </p>
            ) : (
              <p style={{ color: '#4a5568' }}>
                Personal tracked total unavailable.
              </p>
            )}
            <p style={{ color: '#4a5568', fontSize: '0.85rem' }}>
              Group approval records this against the trip pot ledger. SHARE does not send a bank payment.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePaySubmit}>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={paySubmitting}
                  style={{ flex: 1 }}
                >
                  {paySubmitting ? <span className="spinner"></span> : 'Request settlement record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Account Modal */}
      {showRemoveModal && (
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
            maxWidth: '520px', 
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
              <h2 style={{ margin: 0 }}>Leave shared trip costs</h2>
              <button
                onClick={() => setShowRemoveModal(false)}
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

            {isOwner ? (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                You are the creator. Select a new owner to transfer creator rights before you leave.
              </p>
            ) : (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                This will remove you from these shared trip costs.
              </p>
            )}

            {isOwner && account.members.length === 0 && (
              <p style={{ color: '#e53e3e' }}>
                You need at least one member to transfer ownership.
              </p>
            )}

            {isOwner && account.members.length > 0 && (
              <div className="form-group">
                <label className="form-label">New Owner</label>
                <select
                  className="form-input"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  required
                >
                  <option value="">Select member</option>
                  {account.members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveAccount}
                className="btn btn-danger"
                disabled={removeSubmitting || (isOwner && account.members.length === 0)}
                style={{ flex: 1 }}
              >
                {removeSubmitting ? <span className="spinner"></span> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
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
              <h2 style={{ margin: 0 }}>Reverse recorded contribution</h2>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setWithdrawDescription('');
                  setError('');
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
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#0369a1', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                Available to reverse (recorded):
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
                £{availableWithdrawal.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: '0.5rem 0 0 0' }}>
                Your recorded contributions minus any previous reversals. This does not withdraw bank funds.
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit}>
              <div className="form-group">
                <label className="form-label">Amount to reverse (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableWithdrawal}
                  className="form-input"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Maximum: £{availableWithdrawal.toFixed(2)}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawDescription}
                  onChange={(e) => setWithdrawDescription(e.target.value)}
                  placeholder="Reason for reversing this recorded contribution"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    setWithdrawDescription('');
                    setError('');
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={withdrawSubmitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableWithdrawal}
                  style={{ flex: 1 }}
                >
                  {withdrawSubmitting ? <span className="spinner"></span> : 'Reverse recorded contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccountDetail;

