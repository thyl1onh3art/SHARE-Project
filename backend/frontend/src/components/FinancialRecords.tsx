import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface FinancialRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
  sharedAccount?: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  owner: string | { _id: string; name: string; email: string };
  members: string[] | Array<{ _id: string; name: string; email: string }>;
  financeRecords: FinancialRecord[];
}

const FinancialRecords: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'input' as 'input' | 'output',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    sharedAccount: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [financeResponse, accountsResponse] = await Promise.all([
        axios.get('/finance'),
        axios.get('/shared-accounts')
      ]);
      setRecords(financeResponse.data);
      setSharedAccounts(accountsResponse.data);
    } catch (err: any) {
      setError('Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post('/finance', {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: new Date(formData.date).toISOString(),
        sharedAccount: formData.sharedAccount || undefined
      });
      
      setFormData({
        type: 'input',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        sharedAccount: ''
      });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError('Failed to create financial record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await axios.delete(`/finance/${id}`);
      fetchData();
    } catch (err: any) {
      setError('Failed to delete financial record');
    }
  };

  // Calculate balance for a shared account
  const calculateAccountBalance = (account: SharedAccount): number => {
    if (!account.financeRecords || account.financeRecords.length === 0) {
      return 0;
    }
    const income = account.financeRecords
      .filter((record: FinancialRecord) => record.type === 'input')
      .reduce((sum: number, record: FinancialRecord) => sum + (record.amount || 0), 0);
    const expenses = account.financeRecords
      .filter((record: FinancialRecord) => record.type === 'output')
      .reduce((sum: number, record: FinancialRecord) => sum + (record.amount || 0), 0);
    return income - expenses;
  };

  // Calculate totals - only count personal transactions (not shared account transactions)
  const personalRecords = records.filter(record => !record.sharedAccount);
  
  const totalIncome = personalRecords
    .filter(record => record.type === 'input')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = personalRecords
    .filter(record => record.type === 'output')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalBalance = totalIncome - totalExpenses;
  
  // Count transactions
  const incomeCount = personalRecords.filter(record => record.type === 'input').length;
  const expenseCount = personalRecords.filter(record => record.type === 'output').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading financial records...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">My Accounts</h1>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Total Balance Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.25rem', opacity: 0.9 }}>Total Balance</h2>
            <p style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold', 
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              £{totalBalance.toFixed(2)}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.9, flexWrap: 'wrap' }}>
              <span>📈 Income: £{totalIncome.toFixed(2)} ({incomeCount} transaction{incomeCount !== 1 ? 's' : ''})</span>
              <span>📉 Expenses: £{totalExpenses.toFixed(2)} ({expenseCount} transaction{expenseCount !== 1 ? 's' : ''})</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
            <div style={{ fontSize: '4rem', opacity: 0.9 }}>💰</div>
            <button 
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }}
            >
              {showForm ? 'Cancel' : '➕ Add Money'}
            </button>
          </div>
        </div>
      </div>

      {/* Shared Accounts Grid */}
      {sharedAccounts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Shared Accounts</h2>
          <div className="grid grid-3" style={{ gap: '1rem' }}>
            {sharedAccounts.map((account) => {
              const balance = calculateAccountBalance(account);
              const memberCount = Array.isArray(account.members) ? account.members.length : 0;
              
              return (
                <Link
                  key={account._id}
                  to={`/shared-accounts`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <div 
                    className="card"
                    style={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: balance >= 0 ? '2px solid #38a169' : '2px solid #e53e3e',
                      height: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: balance >= 0 
                          ? 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)' 
                          : 'linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        marginRight: '1rem'
                      }}>
                        🏦
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                          {account.name}
                        </h3>
                        {account.description && (
                          <p style={{ 
                            margin: 0, 
                            fontSize: '0.85rem', 
                            color: '#4a5568',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {account.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      background: balance >= 0 ? '#f0fff4' : '#fff5f5',
                      border: `1px solid ${balance >= 0 ? '#c6f6d5' : '#fed7d7'}`
                    }}>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#4a5568',
                        marginBottom: '0.25rem'
                      }}>
                        Balance
                      </div>
                      <div style={{
                        fontSize: '1.75rem',
                        fontWeight: 'bold',
                        color: balance >= 0 ? '#38a169' : '#e53e3e'
                      }}>
                        {balance >= 0 ? '+' : ''}£{balance.toFixed(2)}
                      </div>
                    </div>
                    
                    <div style={{ 
                      marginTop: '0.75rem', 
                      fontSize: '0.85rem', 
                      color: '#4a5568',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>👥 {memberCount + 1} member{memberCount !== 0 ? 's' : ''}</span>
                      <span>📝 {account.financeRecords?.length || 0} transaction{(account.financeRecords?.length || 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {sharedAccounts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
          <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
            You don't have any shared accounts yet.
          </p>
          <Link to="/shared-accounts" className="btn btn-primary">
            Create Shared Account
          </Link>
        </div>
      )}

      {/* Add Record Form */}
      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Add Money Transaction</h2>
          <form onSubmit={handleSubmit}>
            {sharedAccounts.length > 0 && (
              <div className="form-group">
                <label className="form-label">💼 Where should this money go?</label>
                <select
                  className="form-select"
                  value={formData.sharedAccount}
                  onChange={(e) => setFormData({ ...formData, sharedAccount: e.target.value })}
                >
                  <option value="">💰 Personal Account</option>
                  {sharedAccounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      🏦 {account.name}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#718096', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                  {formData.sharedAccount 
                    ? `Money will be added to the selected shared account`
                    : `Money will be added to your personal balance`}
                </small>
              </div>
            )}

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'input' | 'output' })}
                  required
                >
                  <option value="input">💰 Money In (Add Money)</option>
                  <option value="output">💸 Money Out (Expense)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder={formData.type === 'input' ? 'Where did this money come from?' : 'What was this expense for?'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? <span className="spinner"></span> : 'Add Record'}
            </button>
          </form>
        </div>
      )}

      {/* Records List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Personal Financial Records</h2>
        <p style={{ color: '#4a5568', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Showing {personalRecords.length} personal transaction{personalRecords.length !== 1 ? 's' : ''}. 
          {records.length > personalRecords.length && ` (${records.length - personalRecords.length} transaction${records.length - personalRecords.length !== 1 ? 's' : ''} in shared accounts)`}
        </p>
        
        {personalRecords.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No personal financial records yet. Add your first record above!
          </p>
        ) : (
          <div className="list">
            {personalRecords.map((record) => (
              <div key={record._id} className="list-item">
                <div>
                  <strong>{record.description}</strong>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    {new Date(record.date).toLocaleDateString()} • {record.type === 'input' ? '💰 Income' : '💸 Expense'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {record.type === 'input' ? '💰' : '💸'}
                      </span>
                      <span style={{ 
                        color: record.type === 'input' ? '#38a169' : '#e53e3e',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}>
                        {record.type === 'input' ? '+' : '-'}£{record.amount.toFixed(2)}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#718096',
                      marginTop: '0.25rem'
                    }}>
                      {record.type === 'input' ? 'Money In' : 'Money Out'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(record._id)}
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialRecords;
