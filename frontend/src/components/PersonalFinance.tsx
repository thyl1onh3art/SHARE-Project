import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FinancialRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
  sharedAccount?: string;
  archivedAccountName?: string;
}

const PersonalFinance: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [financeResponse, archivedResponse] = await Promise.all([
        axios.get('/finance'),
        axios.get('/finance/archived')
      ]);
      const allRecords = financeResponse.data;
      const personalRecords = allRecords.filter((record: FinancialRecord) => !record.sharedAccount);
      setRecords(personalRecords);
      setArchivedRecords(archivedResponse.data);
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
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading financial records...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Personal Financial Records</h1>
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
          <h3 style={{ color: '#667eea', marginBottom: '1rem' }}>Total Balance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
            £{totalBalance.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Total Income</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            £{totalIncome.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {incomeCount} transaction{incomeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Total Expenses</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            £{totalExpenses.toFixed(2)}
          </p>
          <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.5rem' }}>
            {expenseCount} transaction{expenseCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Records List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>All Transactions</h2>
        <p style={{ color: '#4a5568', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Showing {records.length} personal transaction{records.length !== 1 ? 's' : ''}.
        </p>
        
        {records.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No personal financial records yet.
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

      {archivedRecords.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Archived Shared Account Transactions</h2>
          <p style={{ color: '#4a5568', fontSize: '0.85rem', marginBottom: '1rem' }}>
            These records are from shared accounts that were deleted. Your transaction history has been kept.
          </p>
          <div className="list">
            {archivedRecords.map((record) => (
              <div key={record._id} className="list-item">
                <div>
                  <strong>{record.description}</strong>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    {new Date(record.date).toLocaleDateString()} • {record.type === 'input' ? 'Income' : 'Expense'}
                    {record.archivedAccountName ? ` • Archived: ${record.archivedAccountName}` : ''}
                  </p>
                </div>
                <span style={{
                  color: record.type === 'input' ? '#38a169' : '#e53e3e',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}>
                  {record.type === 'input' ? '+' : '-'}£{record.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalFinance;

