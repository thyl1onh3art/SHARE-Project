import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface FinanceRecord {
  _id?: string;
  amount?: number;
  type?: 'input' | 'output';
  description?: string;
  date?: string;
  sharedAccount?: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  owner: string;
  members: string[];
  financeRecords: FinanceRecord[];
  createdAt: string;
}

const EMPTY_FORM = { name: '', memberIds: '' };
const EMPTY_TRANSFER = { amount: '', description: '' };

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

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
        setError(err.response?.data?.message || 'Failed to load shared accounts');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateAccountBalance = (account: SharedAccount): number => {
    if (!Array.isArray(account.financeRecords)) {
      return 0;
    }

    return account.financeRecords.reduce((balance, record) => {
      if (!record || typeof record !== 'object') {
        return balance;
      }
      const amount = record.amount || 0;
      if (record.type === 'input') {
        return balance + amount;
      }
      if (record.type === 'output') {
        return balance - amount;
      }
      return balance;
    }, 0);
  };

  const fetchPersonalBalance = async () => {
    try {
      setLoadingPersonalBalance(true);
      const response = await axios.get('/finance');
      const personalRecords = response.data.filter((record: FinanceRecord) => !record.sharedAccount);

      const income = personalRecords
        .filter(record => record.type === 'input')
        .reduce((sum, record) => sum + (record.amount || 0), 0);

      const expenses = personalRecords
        .filter(record => record.type === 'output')
        .reduce((sum, record) => sum + (record.amount || 0), 0);

      setPersonalBalance(income - expenses);
    } catch (err) {
      console.error('Failed to fetch personal balance', err);
      setPersonalBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const memberIds = formData.memberIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      await axios.post('/shared-accounts', {
        name: formData.name,
        memberIds
      });

      setFormData(EMPTY_FORM);
      setShowForm(false);
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create shared account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this shared account?')) {
      return;
    }

    try {
      setError('');
      await axios.delete(`/shared-accounts/${id}`);
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete shared account');
    }
  };

  const openTransferModal = async (account: SharedAccount) => {
    setSelectedAccount(account);
    setTransferForm({ amount: '', description: `Transfer to ${account.name}` });
    setShowTransferModal(true);
    await fetchPersonalBalance();
  };

  const transferFundsToSharedAccount = async (
    account: SharedAccount,
    amount: number,
    description?: string
  ) => {
    if (!account?._id) {
      throw new Error('Invalid shared account');
    }
    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    const personalResponse = await axios.get('/finance');
    const personalRecords = personalResponse.data.filter((record: FinanceRecord) => !record.sharedAccount);
    const income = personalRecords
      .filter(record => record.type === 'input')
      .reduce((sum, record) => sum + (record.amount || 0), 0);
    const expenses = personalRecords
      .filter(record => record.type === 'output')
      .reduce((sum, record) => sum + (record.amount || 0), 0);
    const currentBalance = income - expenses;

    if (amount > currentBalance) {
      throw new Error(`Insufficient personal balance. Available £${currentBalance.toFixed(2)}`);
    }

    const date = new Date().toISOString();
    const details = description || `Transfer to ${account.name}`;

    await axios.post('/finance', {
      type: 'output',
      amount,
      date,
      description: details
    });

    await axios.post('/finance', {
      type: 'input',
      amount,
      date,
      description: details,
      sharedAccount: account._id
    });

    await fetchAccounts();
    await fetchPersonalBalance();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const amount = parseFloat(transferForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Please enter a valid transfer amount');
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
      setSelectedAccount(null);
      setTransferForm(EMPTY_TRANSFER);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to transfer funds');
    } finally {
      setTransferSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
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
        <p style={{ color: '#4a5568', marginTop: '0.5rem' }}>
          Manage group accounts and transfer money directly from your personal balance.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Create Shared Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Family Budget"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Member IDs (comma separated)</label>
              <input
                type="text"
                className="form-input"
                value={formData.memberIds}
                onChange={(e) => setFormData({ ...formData, memberIds: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your Shared Accounts</h2>
        {accounts.length === 0 ? (
          <p style={{ color: '#4a5568' }}>
            No shared accounts yet. Create your first shared account above.
          </p>
        ) : (
          <div className="grid grid-2">
            {accounts.map(account => {
              const balance = calculateAccountBalance(account);
              return (
                <div key={account._id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0 }}>{account.name}</h3>
                    <button
                      onClick={() => handleDelete(account._id)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <p style={{ margin: 0, color: '#0369a1', fontWeight: 'bold', fontSize: '1.25rem' }}>
                      £{balance.toFixed(2)}
                    </p>
                    <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9rem' }}>
                      Current balance
                    </p>
                  </div>

                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Members:</strong> {account.members.length}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Records:</strong> {account.financeRecords.length}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    <strong>Created:</strong> {new Date(account.createdAt).toLocaleDateString()}
                  </p>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem' }}
                    onClick={() => openTransferModal(account)}
                  >
                    Transfer From Personal Account
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {accounts.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Quick Stats</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#4a5568' }}>Total Accounts</p>
              <strong style={{ fontSize: '1.5rem' }}>{accounts.length}</strong>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#4a5568' }}>Total Members</p>
              <strong style={{ fontSize: '1.5rem' }}>
                {accounts.reduce((sum, account) => sum + account.members.length, 0)}
              </strong>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, color: '#4a5568' }}>Total Records</p>
              <strong style={{ fontSize: '1.5rem' }}>
                {accounts.reduce((sum, account) => sum + account.financeRecords.length, 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && selectedAccount && (
        <div style={{
          position: 'fixed',
          inset: 0,
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
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Transfer to {selectedAccount.name}</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedAccount(null);
                  setTransferForm(EMPTY_TRANSFER);
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
              marginTop: '1rem',
              background: '#eef2ff',
              border: '1px solid #c3dafe',
              borderRadius: '8px',
              padding: '0.75rem'
            }}>
              <p style={{ margin: 0, color: '#4c51bf', fontWeight: 'bold' }}>
                Personal Account Balance
              </p>
              {loadingPersonalBalance ? (
                <p style={{ margin: '0.5rem 0', color: '#4a5568' }}>Loading balance...</p>
              ) : personalBalance !== null ? (
                <p style={{ margin: '0.5rem 0', fontSize: '1.5rem', color: '#4c51bf' }}>
                  £{personalBalance.toFixed(2)}
                </p>
              ) : (
                <p style={{ margin: '0.5rem 0', color: '#c53030' }}>
                  Unable to load personal balance.
                </p>
              )}
              <p style={{ margin: 0, color: '#4a5568', fontSize: '0.85rem' }}>
                Transfers deduct from your personal balance and add to this shared account automatically.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Amount (£)</label>
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
                {personalBalance !== null && (
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#4a5568' }}>
                    Available: £{personalBalance.toFixed(2)}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  placeholder="Transfer description"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedAccount(null);
                    setTransferForm(EMPTY_TRANSFER);
                    setPersonalBalance(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={transferSubmitting}
                >
                  {transferSubmitting ? <span className="spinner" /> : 'Transfer'}
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
