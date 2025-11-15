import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FinancialRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
}

const FinancialRecords: React.FC = () => {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'output' as 'input' | 'output',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/finance');
      setRecords(response.data);
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
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      });
      
      setFormData({
        type: 'output',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      fetchRecords();
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
      fetchRecords();
    } catch (err: any) {
      setError('Failed to delete financial record');
    }
  };

  const totalIncome = records
    .filter(record => record.type === 'input')
    .reduce((sum, record) => sum + record.amount, 0);

  const totalExpenses = records
    .filter(record => record.type === 'output')
    .reduce((sum, record) => sum + record.amount, 0);

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
          <h1 className="card-title">Financial Records</h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Add Record'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Summary Cards */}
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
          <h3 style={{ color: '#2b6cb0', marginBottom: '1rem' }}>📊 Total Records</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2b6cb0' }}>
            {records.length}
          </p>
        </div>
      </div>

      {/* Add Record Form */}
      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Add New Financial Record</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'input' | 'output' })}
                  required
                >
                  <option value="output">Expense</option>
                  <option value="input">Income</option>
                </select>
              </div>

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
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="What was this for?"
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
        <h2 style={{ marginBottom: '1rem' }}>All Financial Records</h2>
        
        {records.length === 0 ? (
          <p style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            No financial records yet. Add your first record above!
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
                  <span style={{ 
                    color: record.type === 'input' ? '#38a169' : '#e53e3e',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}>
                    {record.type === 'input' ? '+' : '-'}£{record.amount.toFixed(2)}
                  </span>
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
