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

const PersonalFinance: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/finance');
      const allRecords = response.data;
      // Only show personal records (not shared account records)
      const personalRecords = allRecords.filter((record: FinancialRecord) => !record.sharedAccount);
      setRecords(personalRecords);
    } catch (err: any) {
      setError('Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      await axios.delete(`/finance/${id}`);
      fetchRecords();
    } catch (err: any) {
      setError('Failed to delete financial record');
    }
  };

  // Calculate totals
  const totalIncome = records
    .filter(record => record.type === 'input')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = records
    .filter(record => record.type === 'output')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalBalance = totalIncome - totalExpenses;

  // Count transactions
  const incomeCount = records.filter(record => record.type === 'input').length;
  const expenseCount = records.filter(record => record.type === 'output').length;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading personal tracked activity...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#718096' }}>
              Secondary · More menu
            </p>
            <h1 className="card-title" style={{ marginBottom: '0.35rem' }}>Personal tracking</h1>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>
              Optional notes of your own recorded activity. SHARE’s main journey is Shared Accounts — not personal banking.
            </p>
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem' }}>
              <Link to="/events" style={{ color: '#2b6cb0' }}>Shared Accounts</Link>
              {' · '}
              <Link to="/invitations" style={{ color: '#2b6cb0' }}>Notifications</Link>
            </p>
          </div>
        </div>
        <div className="trip-money-transparency" style={{ marginTop: '1rem' }}>
          These figures are a personal activity view. SHARE does not hold this amount in a bank account.
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Personal tracked total</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
            £{totalBalance.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Recorded in</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            £{totalIncome.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {incomeCount} record{incomeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Recorded out</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            £{totalExpenses.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {expenseCount} record{expenseCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Records List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Personal activity</h2>
        <p style={{ color: '#4a5568', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Showing {records.length} personal record{records.length !== 1 ? 's' : ''} (excludes Shared Account group entries).
        </p>
        
        {records.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No personal activity recorded yet. For group costs, use{' '}
            <Link to="/events">Shared Accounts</Link>.
          </p>
        ) : (
          <div className="list">
            {records.map((record) => (
              <div key={record._id} className="list-item">
                <div>
                  <strong>{record.description}</strong>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    {new Date(record.date).toLocaleDateString()} • {record.type === 'input' ? 'Income' : 'Expense'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ 
                        color: record.type === 'input' ? '#38a169' : '#e53e3e',
                        fontWeight: 'bold',
                        fontSize: '1.1rem'
                      }}>
                        {record.type === 'input' ? '+' : '-'}£{record.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(record._id)}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
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

export default PersonalFinance;

