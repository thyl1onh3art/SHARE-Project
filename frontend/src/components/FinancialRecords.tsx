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
  const [showCardModal, setShowCardModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'input' as 'input' | 'output',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    sharedAccount: '',
    fromAccount: 'personal' as 'personal' | 'card'
  });
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
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
      // Sort shared accounts by creation date (most recent first)
      const sortedAccounts = accountsResponse.data.sort((a: SharedAccount, b: SharedAccount) => {
        const dateA = new Date((a as any).createdAt || 0).getTime();
        const dateB = new Date((b as any).createdAt || 0).getTime();
        return dateB - dateA;
      });
      setSharedAccounts(sortedAccounts);
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
        sharedAccount: '',
        fromAccount: 'personal'
      });
      setCardData({
        cardNumber: '',
        cardName: '',
        expiryDate: '',
        cvv: ''
      });
      setShowForm(false);
      setShowCardModal(false);
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
              <span>Income: £{totalIncome.toFixed(2)} ({incomeCount} transaction{incomeCount !== 1 ? 's' : ''})</span>
              <span>Expenses: £{totalExpenses.toFixed(2)} ({expenseCount} transaction{expenseCount !== 1 ? 's' : ''})</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
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
              {showForm ? 'Cancel' : 'Add Money'}
            </button>
          </div>
        </div>
      </div>

      {/* Shared Accounts Grid - Show only 2 most recent */}
      {sharedAccounts.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Shared Accounts</h2>
            <Link to="/shared-accounts" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
              View All Shared Accounts
            </Link>
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            {sharedAccounts.slice(0, 2).map((account) => {
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
                        marginRight: '1rem'
                      }}>
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
                      <span>{memberCount + 1} member{memberCount !== 0 ? 's' : ''}</span>
                      <span>{account.financeRecords?.length || 0} transaction{(account.financeRecords?.length || 0) !== 1 ? 's' : ''}</span>
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
          <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
            You don't have any shared accounts yet.
          </p>
          <Link to="/shared-accounts" className="btn btn-primary">
            Create Shared Account
          </Link>
        </div>
      )}

      {/* Add Record Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => {
          setShowForm(false);
          setFormData({
            type: 'input',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            sharedAccount: '',
            fromAccount: 'personal'
          });
        }}
        >
          <div className="card" style={{
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Add Money Transaction</h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: 'input',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    sharedAccount: '',
                    fromAccount: 'personal'
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">From</label>
              <select
                className="form-select"
                value={formData.fromAccount}
                onChange={(e) => {
                  const fromAccount = e.target.value as 'personal' | 'card';
                  setFormData({ ...formData, fromAccount });
                  if (fromAccount === 'card') {
                    setShowCardModal(true);
                  }
                }}
                required
              >
                <option value="personal">Personal Account</option>
                <option value="card">Debit/Credit Card</option>
              </select>
            </div>

            {sharedAccounts.length > 0 && (
              <div className="form-group">
                <label className="form-label">To (Optional)</label>
                <select
                  className="form-select"
                  value={formData.sharedAccount}
                  onChange={(e) => setFormData({ ...formData, sharedAccount: e.target.value })}
                >
                  <option value="">Personal Account</option>
                  {sharedAccounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="What is this for?"
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: 'input',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    sharedAccount: '',
                    fromAccount: 'personal'
                  });
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || (formData.fromAccount === 'card' && !cardData.cardNumber)}
                style={{ flex: 1 }}
              >
                {submitting ? <span className="spinner"></span> : 'Add Money'}
              </button>
            </div>
          </form>
        </div>
        </div>
      )}

      {/* Card Details Modal */}
      {showCardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => {
          setShowCardModal(false);
          setFormData({ ...formData, fromAccount: 'personal' });
        }}
        >
          <div className="card" style={{
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Card Details</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCardModal(false);
                  setFormData({ ...formData, fromAccount: 'personal' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Cardholder Name</label>
              <input
                type="text"
                className="form-input"
                value={cardData.cardName}
                onChange={(e) => setCardData({ ...cardData, cardName: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input
                type="text"
                className="form-input"
                value={cardData.cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
                  const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                  setCardData({ ...cardData, cardNumber: formatted });
                }}
                required
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardData.expiryDate}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + '/' + value.slice(2, 4);
                    }
                    setCardData({ ...cardData, expiryDate: value.slice(0, 5) });
                  }}
                  required
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>

              <div className="form-group">
                <label className="form-label">CVV</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardData.cvv}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCardData({ ...cardData, cvv: value });
                  }}
                  required
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (cardData.cardNumber && cardData.cardName && cardData.expiryDate && cardData.cvv) {
                  setShowCardModal(false);
                }
              }}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              Save Card Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialRecords;
