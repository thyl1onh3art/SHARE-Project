import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface FinancialRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
}

interface SharedAccount {
  _id: string;
  name: string;
  owner: string;
  members: string[];
  financeRecords: any[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [financeResponse, accountsResponse] = await Promise.all([
        axios.get('/finance'),
        axios.get('/shared-accounts')
      ]);
      
      setFinancialRecords(financeResponse.data);
      setSharedAccounts(accountsResponse.data);
    } catch (err: any) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = financialRecords
    .filter(record => record.type === 'input')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = financialRecords
    .filter(record => record.type === 'output')
    .reduce((sum, record) => sum + record.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Welcome back, {user?.name}! 👋</h1>
          <p style={{ color: '#4a5568', marginTop: '0.5rem' }}>
            Here's an overview of your financial activity
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>💰 Total Income</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            £{totalIncome.toFixed(2)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>💸 Total Expenses</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            £{totalExpenses.toFixed(2)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: netBalance >= 0 ? '#38a169' : '#e53e3e', marginBottom: '1rem' }}>
            📊 Net Balance
          </h3>
          <p style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: netBalance >= 0 ? '#38a169' : '#e53e3e' 
          }}>
            £{netBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Recent Financial Records */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Financial Records</h2>
          <Link to="/financial-records" className="btn btn-primary">
            View All
          </Link>
        </div>
        
        {financialRecords.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No financial records yet. <Link to="/financial-records">Add your first record</Link>
          </p>
        ) : (
          <div className="list">
            {financialRecords.slice(0, 5).map((record) => (
              <div key={record._id} className="list-item">
                <div>
                  <strong>{record.description}</strong>
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    {new Date(record.date).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ 
                  color: record.type === 'input' ? '#38a169' : '#e53e3e',
                  fontWeight: 'bold'
                }}>
                  {record.type === 'input' ? '+' : '-'}£{record.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Accounts */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Shared Accounts</h2>
          <Link to="/shared-accounts" className="btn btn-primary">
            Manage Accounts
          </Link>
        </div>
        
        {sharedAccounts.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No shared accounts yet. <Link to="/shared-accounts">Create your first shared account</Link>
          </p>
        ) : (
          <div className="grid grid-2">
            {sharedAccounts.map((account) => (
              <div key={account._id} className="card" style={{ margin: 0 }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{account.name}</h3>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                  {account.members.length} member{account.members.length !== 1 ? 's' : ''}
                </p>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                  {account.financeRecords.length} record{account.financeRecords.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
