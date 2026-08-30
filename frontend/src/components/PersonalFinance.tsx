import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  buildPersonalSavingsPlan,
  CONTRIBUTION_FREQUENCIES,
  ContributionFrequency,
  findUserContributionPlan,
  formatMoneyAmount,
  frequencyMeta,
  personRecordId,
  PersonalSavingsPlan
} from '../utils/tripHome';

interface FinancialRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  description: string;
  date: string;
  sharedAccount?: string;
  user?: { _id?: string; id?: string } | string;
}

interface SharedAccountSummary {
  _id: string;
  name: string;
  targetAmount?: number;
  targetDate?: string;
  plannedContributors?: number;
  contributionPlans?: Array<{
    user?: { _id?: string; id?: string } | string;
    frequency?: string;
    agreed?: boolean;
    agreedAt?: string;
  }>;
  isDeleted?: boolean;
  owner?: { _id?: string } | string;
  members?: Array<{ _id?: string } | string>;
  financeRecords?: FinancialRecord[];
}

function contributionForUser(records: FinancialRecord[] | undefined, userId: string): number {
  if (!userId) return 0;
  return (records || []).reduce((sum, record) => {
    if (record.type !== 'input') return sum;
    if (personRecordId(record.user) !== userId) return sum;
    return sum + (Number(record.amount) || 0);
  }, 0);
}

const PersonalFinance: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<PersonalSavingsPlan[]>([]);
  const [savingPlanId, setSavingPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUserId = user ? String((user as { _id?: string; id?: string })._id || user.id || '') : '';

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const [financeResponse, accountsResponse] = await Promise.all([
        axios.get('/finance'),
        axios.get('/shared-accounts').catch(() => ({ data: [] }))
      ]);
      const allRecords = financeResponse.data;
      const personalRecords = allRecords.filter((record: FinancialRecord) => !record.sharedAccount);
      setRecords(personalRecords);

      const accounts: SharedAccountSummary[] = Array.isArray(accountsResponse.data)
        ? accountsResponse.data
        : [];
      const plans = accounts
        .filter((account) => !account.isDeleted)
        .map((account) => buildPersonalSavingsPlan({
          id: account._id,
          name: account.name,
          targetAmount: account.targetAmount,
          plannedContributors: account.plannedContributors,
          owner: account.owner as { _id: string },
          members: account.members as Array<{ _id: string }>,
          contributed: contributionForUser(account.financeRecords, currentUserId),
          deadline: account.targetDate,
          userPlan: findUserContributionPlan(account.contributionPlans, currentUserId)
        }))
        .filter((plan): plan is PersonalSavingsPlan => plan !== null);
      setSavingsPlans(plans);
    } catch (err: any) {
      setError('Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const saveContributionPlan = async (
    accountId: string,
    frequency: ContributionFrequency,
    alreadyAgreed: boolean
  ) => {
    if (!accountId) return;
    setSavingPlanId(accountId);
    setError('');
    try {
      await axios.put(`/shared-accounts/${accountId}/contribution-plan`, {
        frequency,
        ...(alreadyAgreed ? {} : { agreed: true })
      });
      await fetchRecords();
    } catch (err: any) {
      setError('Could not update your contribution plan');
    } finally {
      setSavingPlanId('');
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

      {savingsPlans.length > 0 && (
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Your contribution plans</h2>
          <p style={{ marginTop: 0, color: '#4a5568', fontSize: '0.9rem' }}>
            Prototype schedules for your planned share. SHARE does not take automatic bank transfers.
          </p>
          {savingsPlans.map((plan) => (
            <div key={plan.id || plan.name} className="personal-savings-plan">
              <h3 className="personal-savings-plan-title">{plan.name}</h3>
              <dl className="personal-savings-plan-stats">
                <div>
                  <dt>Your planned contribution</dt>
                  <dd>{formatMoneyAmount(plan.plannedShare)}</dd>
                </div>
                <div>
                  <dt>Contributed</dt>
                  <dd>{formatMoneyAmount(plan.contributed)}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{formatMoneyAmount(plan.remaining)}</dd>
                </div>
              </dl>
              {plan.covered ? (
                <p className="personal-savings-plan-covered">Your planned contribution is covered</p>
              ) : plan.deadlineState === 'past' ? (
                <p className="personal-savings-plan-note">Deadline passed</p>
              ) : plan.deadlineState === 'today' ? (
                <p className="personal-savings-plan-note">
                  Amount needed today {formatMoneyAmount(plan.remaining)}
                </p>
              ) : plan.agreed && plan.frequency ? (
                <>
                  <p className="personal-savings-plan-note">
                    Your contribution plan {frequencyMeta(plan.frequency).label}
                  </p>
                  {plan.recurringAmount !== null && (
                    <p className="personal-savings-plan-note">
                      Suggested next recurring amount {formatMoneyAmount(plan.recurringAmount)} {plan.recurringPerLabel}
                    </p>
                  )}
                  {plan.deadlineLabel && (
                    <p className="personal-savings-plan-note">Goal date {plan.deadlineLabel}</p>
                  )}
                  <fieldset className="contribution-frequency-options" disabled={savingPlanId === plan.id}>
                    <legend className="form-label">Change contribution plan</legend>
                    {CONTRIBUTION_FREQUENCIES.map((option) => (
                      <label key={option.value} className="contribution-frequency-option">
                        <input
                          type="radio"
                          name={`personal-plan-${plan.id}`}
                          value={option.value}
                          checked={plan.frequency === option.value}
                          onChange={() => saveContributionPlan(plan.id || '', option.value, true)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                </>
              ) : (
                <>
                  <p className="personal-savings-plan-note">Suggested contribution plan</p>
                  {plan.deadlineLabel && (
                    <p className="personal-savings-plan-note">Goal date {plan.deadlineLabel}</p>
                  )}
                  <dl className="personal-savings-plan-cadence">
                    <div>
                      <dt>Weekly</dt>
                      <dd>{formatMoneyAmount(plan.weekly || 0)}</dd>
                    </div>
                    <div>
                      <dt>Every 2 weeks</dt>
                      <dd>{formatMoneyAmount(plan.fortnightly || 0)}</dd>
                    </div>
                    <div>
                      <dt>Monthly</dt>
                      <dd>{formatMoneyAmount(plan.monthly || 0)}</dd>
                    </div>
                  </dl>
                  <fieldset className="contribution-frequency-options" disabled={savingPlanId === plan.id}>
                    <legend className="form-label">Choose a plan</legend>
                    {CONTRIBUTION_FREQUENCIES.map((option) => (
                      <label key={option.value} className="contribution-frequency-option">
                        <input
                          type="radio"
                          name={`personal-plan-${plan.id}`}
                          value={option.value}
                          onChange={() => saveContributionPlan(plan.id || '', option.value, false)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                  <p className="contribution-plan-disclaimer">
                    Prototype contribution plan — no automatic bank transfer is currently made.
                  </p>
                </>
              )}
            </div>
          ))}
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

