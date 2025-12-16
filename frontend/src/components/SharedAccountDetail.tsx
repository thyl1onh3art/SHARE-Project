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
      const userId = (user as any)._id || (user as any).id || '';
      const available = calculateAvailableWithdrawal(userId);
      setAvailableWithdrawal(available);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactions]);

  const handleWithdrawClick = () => {
    if (user) {
      const userId = (user as any)._id || (user as any).id || '';
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
      setError(err.response?.data?.message || 'Failed to process withdrawal');
    } finally {
      setWithdrawSubmitting(false);
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
          Back to Shared Accounts
        </button>
      </div>
    );
  }

  const balance = calculateBalance();
  const userId = user ? (user as any)._id || (user as any).id || '' : '';
  const userContribution = user ? calculateUserContribution(userId) : 0;
  const allParticipants = [account.owner, ...account.members];

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/shared-accounts')}>
          ← Back to Shared Accounts
        </button>
        <h1 style={{ margin: 0 }}>{account.name}</h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Account Summary */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Account Summary</h2>
        {account.description && (
          <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
            <strong>Description:</strong> {account.description}
          </p>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Current Balance</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
              £{balance.toFixed(2)}
            </p>
          </div>
          {account.targetAmount && (
            <div>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Target Amount</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
                £{account.targetAmount.toFixed(2)}
              </p>
            </div>
          )}
          <div>
            <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Participants</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
              {allParticipants.length}
            </p>
          </div>
          {user && (
            <>
              <div>
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Your Contribution</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2b6cb0', margin: '0.25rem 0 0 0' }}>
                  £{userContribution.toFixed(2)}
                </p>
              </div>
              <div>
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>Available to Withdraw</p>
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

        {/* Withdrawal Button */}
        {user && availableWithdrawal > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              className="btn btn-success"
              onClick={handleWithdrawClick}
              style={{ width: '100%' }}
            >
              Withdraw Your Funds (£{availableWithdrawal.toFixed(2)} available)
            </button>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="card">
        <h2 className="card-title">Transaction History</h2>
        {transactions.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No transactions yet.</p>
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
                {transactions.map((transaction) => (
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
                        {transaction.type === 'input' ? 'Deposit' : 'Withdrawal'}
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
              <h2 style={{ margin: 0 }}>Withdraw Funds</h2>
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
                Available to Withdraw:
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
                £{availableWithdrawal.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: '0.5rem 0 0 0' }}>
                This is the amount you've contributed minus any previous withdrawals.
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit}>
              <div className="form-group">
                <label className="form-label">Withdrawal Amount (£)</label>
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
                  placeholder="Reason for withdrawal"
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
                  {withdrawSubmitting ? <span className="spinner"></span> : 'Withdraw Funds'}
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

