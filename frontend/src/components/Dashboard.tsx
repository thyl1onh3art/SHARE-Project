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
  const [invitesCount, setInvitesCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [galleryCount, setGalleryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [accountDetails, setAccountDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);

  useEffect(() => {
    setSetupDismissed(localStorage.getItem('setupChecklistDismissed') === '1');
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        axios.get('/finance'),
        axios.get('/shared-accounts'),
        axios.get('/invites/list'),
        axios.get('/events'),
        axios.get('/gallery/images')
      ]);

      const financeResult = results[0];
      const accountsResult = results[1];
      const invitesResult = results[2];
      const eventsResult = results[3];
      const galleryResult = results[4];

      if (financeResult.status === 'fulfilled') {
        setFinancialRecords(financeResult.value.data || []);
      } else {
        setFinancialRecords([]);
      }

      if (accountsResult.status === 'fulfilled') {
        setSharedAccounts(accountsResult.value.data || []);
      } else {
        setSharedAccounts([]);
      }

      if (invitesResult.status === 'fulfilled') {
        setInvitesCount(Array.isArray(invitesResult.value.data) ? invitesResult.value.data.length : 0);
      } else {
        setInvitesCount(0);
      }

      if (eventsResult.status === 'fulfilled') {
        setEventsCount(Array.isArray(eventsResult.value.data) ? eventsResult.value.data.length : 0);
      } else {
        setEventsCount(0);
      }

      if (galleryResult.status === 'fulfilled') {
        setGalleryCount(Array.isArray(galleryResult.value.data) ? galleryResult.value.data.length : 0);
      } else {
        setGalleryCount(0);
      }

      const anyFailed = results.some(r => r.status === 'rejected');
      if (anyFailed) {
        setError('Some dashboard sections could not be loaded (showing what we can).');
      }
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

  // Guided setup checklist completion
  const isEmailVerified = false; // Email verification is currently disabled in the app flow
  const hasSharedAccount = sharedAccounts.length > 0;
  const hasInvite = invitesCount > 0;
  const hasFirstItem = financialRecords.length > 0 || eventsCount > 0 || galleryCount > 0;

  const setupSteps = [
    {
      key: 'verify-email',
      title: 'Verify your email',
      description: 'Currently disabled (do this later).',
      done: isEmailVerified,
      cta: null as null | { to: string; label: string }
    },
    {
      key: 'add-account',
      title: 'Create a shared account',
      description: 'Create an account to collaborate with others.',
      done: hasSharedAccount,
      cta: { to: '/shared-accounts', label: 'Create shared account' }
    },
    {
      key: 'invite',
      title: 'Invite someone',
      description: 'Send an invitation to join a shared account.',
      done: hasInvite,
      cta: { to: '/invitations', label: 'Send invite' }
    },
    {
      key: 'first-item',
      title: 'Create your first record/event/gallery item',
      description: 'Add at least one item so the app can start tracking.',
      done: hasFirstItem,
      cta: { to: '/financial-records', label: 'Add first record' }
    }
  ];

  const completedCount = setupSteps.filter(s => s.done).length;
  const totalCount = setupSteps.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const dismissSetupChecklist = () => {
    localStorage.setItem('setupChecklistDismissed', '1');
    setSetupDismissed(true);
  };

  const handleViewDetails = async (accountId: string) => {
    try {
      setLoadingDetails(true);
      setError('');
      const response = await axios.get(`/shared-accounts/${accountId}`);
      setAccountDetails(response.data);
      setShowDetailsModal(true);
    } catch (err: any) {
      setError('Failed to load account details');
    } finally {
      setLoadingDetails(false);
    }
  };

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
          <h1 className="card-title">Welcome back, {user?.name}!</h1>
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

      {!setupDismissed && (
        <div className="card" style={{ border: '1px solid #e2e8f0' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>Getting started</h2>
              <p style={{ color: '#4a5568', margin: 0 }}>
                {completedCount}/{totalCount} complete • {progressPct}%
              </p>
            </div>
            <button className="btn btn-secondary" onClick={dismissSetupChecklist}>
              Hide
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              width: '100%',
              height: '10px',
              background: '#edf2f7',
              borderRadius: '999px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.2s ease'
              }} />
            </div>
          </div>

          <div className="list">
            {setupSteps.map(step => (
              <div key={step.key} className="list-item" style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    background: step.done ? '#c6f6d5' : '#edf2f7',
                    color: step.done ? '#22543d' : '#4a5568',
                    flexShrink: 0
                  }}>
                    {step.done ? '✓' : '•'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{step.title}</div>
                    <div style={{ color: '#4a5568', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                      {step.description}
                    </div>
                    {!step.done && step.key === 'first-item' && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <Link to="/financial-records" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                          Add record
                        </Link>
                        <Link to="/events" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                          Add event
                        </Link>
                        <Link to="/gallery" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                          Upload image
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                {!step.done && step.cta && step.key !== 'first-item' && (
                  <Link to={step.cta.to} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    {step.cta.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Total Income</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            £{totalIncome.toFixed(2)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Total Expenses</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            £{totalExpenses.toFixed(2)}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: netBalance >= 0 ? '#38a169' : '#e53e3e', marginBottom: '1rem' }}>
            Net Balance
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
              <div 
                key={account._id} 
                className="card" 
                style={{ 
                  margin: 0, 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onClick={() => handleViewDetails(account._id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <h3 style={{ marginBottom: '0.5rem' }}>{account.name}</h3>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                  {account.members.length} member{account.members.length !== 1 ? 's' : ''}
                </p>
                <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
                  {account.financeRecords.length} record{account.financeRecords.length !== 1 ? 's' : ''}
                </p>
                <p style={{ color: '#2b6cb0', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: '500' }}>
                  Click to view details →
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Details Modal */}
      {showDetailsModal && accountDetails && (
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
            maxWidth: '700px', 
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
              <h2 style={{ margin: 0 }}>Account Details: {accountDetails.name}</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setAccountDetails(null);
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

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading details...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Account Information</h3>
                  <div style={{
                    background: '#f7fafc',
                    padding: '1rem',
                    borderRadius: '6px',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Name:</strong> {accountDetails.name}
                    </p>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Created:</strong> {new Date(accountDetails.createdAt).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.5rem 0' }}>
                      <strong>Finance Records:</strong> {accountDetails.financeRecords?.length || 0}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Members ({accountDetails.members?.length || 0})</h3>
                  {accountDetails.members && accountDetails.members.length > 0 ? (
                    <div style={{
                      background: '#f7fafc',
                      padding: '1rem',
                      borderRadius: '6px'
                    }}>
                      {accountDetails.members.map((member: any, index: number) => {
                        const isOwner = member._id === accountDetails.owner || member === accountDetails.owner;
                        return (
                          <div
                            key={member._id || member || index}
                            style={{
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              backgroundColor: isOwner ? '#dbeafe' : 'white',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: isOwner ? 'bold' : 'normal' }}>
                              {member.email || member.firstName || member || 'Unknown'} {isOwner && '(Owner)'}
                            </p>
                            {member.firstName && (
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
                                {member.firstName} {member.lastName}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#6b7280' }}>No members yet</p>
                  )}
                </div>

                {accountDetails.financeRecords && accountDetails.financeRecords.length > 0 && (
                  <div>
                    <h3 style={{ color: '#2b6cb0', marginBottom: '0.5rem' }}>Finance Records ({accountDetails.financeRecords.length})</h3>
                    <div style={{
                      background: '#f7fafc',
                      padding: '1rem',
                      borderRadius: '6px',
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}>
                      {accountDetails.financeRecords.map((record: any, index: number) => (
                        <div
                          key={record._id || index}
                          style={{
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 'bold' }}>
                                {record.type === 'input' ? 'Income' : 'Expense'}
                              </p>
                              <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                                {record.description || 'No description'}
                              </p>
                              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                {new Date(record.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: record.type === 'input' ? '#38a169' : '#e53e3e'
                            }}>
                              {record.type === 'input' ? '+' : '-'}£{record.amount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setAccountDetails(null);
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Close
                  </button>
                  <Link
                    to="/shared-accounts"
                    className="btn btn-secondary"
                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                  >
                    Manage Account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
