import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  equalShareAmount,
  formatGbp,
  personalRemaining,
  tripCountdownLabel,
  tripMoneyParticipantCount,
  contributionProgressTotal,
  canPaySinglePayment,
  isCompletedPaymentStatus,
  sortClosedNewestFirst,
  visibleClosedAccounts,
  TripMoneySummary
} from '../utils/tripHome';
import { userFacingError } from '../utils/userFacingError';

interface Event {
  _id?: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  category: string;
  isRecurring: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  budget?: {
    totalAmount: number;
    currency: string;
    savingsGoal: number;
    savingsFrequency: 'weekly' | 'biweekly' | 'monthly';
    amountPerPeriod: number;
    startDate: string;
    isActive: boolean;
  };
  accommodation?: {
    name: string;
    type: 'hotel' | 'airbnb' | 'hostel' | 'resort' | 'other';
    price: number;
    bookingLink: string;
    notes: string;
  };
  isShared?: boolean;
  sharedWith?: string[];
  tripMoney?: TripMoneySummary | null;
  ownedByCurrentUser?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const EventCountdown: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = (user as { _id?: string; id?: string } | null)?._id
    || (user as { _id?: string; id?: string } | null)?.id
    || '';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Event>({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '00:00',
    location: '',
    category: 'holiday',
    isRecurring: false,
    recurringType: 'yearly',
    budget: {
      totalAmount: 0,
      currency: 'GBP',
      savingsGoal: 0,
      savingsFrequency: 'monthly',
      amountPerPeriod: 0,
      startDate: '',
      isActive: false
    },
    accommodation: {
      name: '',
      type: 'hotel',
      price: 0,
      bookingLink: '',
      notes: ''
    },
    isShared: false,
    sharedWith: []
  });
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [accountList, setAccountList] = useState<any[]>([]);
  const [closedAccountList, setClosedAccountList] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [showMoreClosed, setShowMoreClosed] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');

  // Keep category values aligned with the existing Event API/model; labels are general.
  const categories = [
    { value: 'holiday', label: 'Holiday' },
    { value: 'travel', label: 'Travel' },
    { value: 'social', label: 'Friends / social' },
    { value: 'sports', label: 'Sports' },
    { value: 'concert', label: 'Festival / tickets' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'anniversary', label: 'Anniversary' },
    { value: 'work', label: 'Work' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchEvents();
    fetchAccountLists();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view your Shared Accounts');
      } else {
        setError(`Failed to load Shared Accounts: ${err.response?.data?.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountLists = async () => {
    try {
      const [activeResponse, archivedResponse, paymentResponse] = await Promise.all([
        axios.get('/shared-accounts'),
        axios.get('/shared-accounts?archived=true').catch(() => ({ data: [] })),
        axios.get('/payment-requests').catch(() => ({ data: [] }))
      ]);
      setAccountList(Array.isArray(activeResponse.data) ? activeResponse.data : []);
      setClosedAccountList(Array.isArray(archivedResponse.data) ? archivedResponse.data : []);
      setPaymentRequests(Array.isArray(paymentResponse.data) ? paymentResponse.data : []);
    } catch {
      setAccountList([]);
      setClosedAccountList([]);
      setPaymentRequests([]);
    }
  };

  const calculateAmountPerPeriod = (): number => {
    if (!formData.budget?.totalAmount || !formData.eventDate) return 0;
    
    const now = new Date();
    const eventDate = new Date(formData.eventDate);
    const timeDiff = eventDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return formData.budget.totalAmount;
    
    let periodsLeft;
    switch (formData.budget.savingsFrequency) {
      case 'weekly':
        periodsLeft = Math.ceil(timeDiff / (7 * 24 * 60 * 60 * 1000));
        break;
      case 'biweekly':
        periodsLeft = Math.ceil(timeDiff / (14 * 24 * 60 * 60 * 1000));
        break;
      case 'monthly':
      default:
        periodsLeft = Math.ceil(timeDiff / (30 * 24 * 60 * 60 * 1000));
        break;
    }
    
    return Math.ceil(formData.budget.totalAmount / Math.max(periodsLeft, 1));
  };

  const calculatePeriodsLeft = (): number => {
    if (!formData.eventDate) return 0;
    
    const now = new Date();
    const eventDate = new Date(formData.eventDate);
    const timeDiff = eventDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 0;
    
    switch (formData.budget?.savingsFrequency || 'monthly') {
      case 'weekly':
        return Math.ceil(timeDiff / (7 * 24 * 60 * 60 * 1000));
      case 'biweekly':
        return Math.ceil(timeDiff / (14 * 24 * 60 * 60 * 1000));
      case 'monthly':
      default:
        return Math.ceil(timeDiff / (30 * 24 * 60 * 60 * 1000));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || submitting) return;
    const amount = parseFloat(targetAmount);
    if (!(amount > 0)) {
      setError('Target must be greater than 0');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const response = await axios.post('/events/with-trip-money', {
        ...formData,
        eventTime: '00:00',
        targetAmount: amount
      });
      const potId = response.data?.sharedAccount?._id;
      if (potId) {
        navigate(`/shared-accounts/${potId}`);
        return;
      }
      setShowForm(false);
      setTargetAmount('');
      fetchEvents();
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not create this Shared Account. Please try again.'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading shared accounts...</p>
      </div>
    );
  }

  type DashboardCard = {
    id: string;
    name: string;
    isClosed: boolean;
    targetAmount?: number | null;
    recordedTotal?: number;
    yourContribution?: number;
    memberCount: number;
    location?: string;
    eventDate?: string;
    eventTime?: string;
    ownedByCurrentUser?: boolean;
    eventId?: string;
    deletedAt?: string | null;
    updatedAt?: string | null;
    owner?: TripMoneySummary['owner'];
    members?: TripMoneySummary['members'];
  };

  const eventByPotId = new Map<string, Event>();
  events.forEach((event) => {
    if (event.tripMoney?._id) {
      eventByPotId.set(String(event.tripMoney._id), event);
    }
  });

  const paymentsForAccount = (accountId: string) =>
    paymentRequests.filter((pr: any) => {
      const requestAccountId =
        typeof pr.sharedAccount === 'object' ? pr.sharedAccount?._id : pr.sharedAccount;
      return String(requestAccountId) === String(accountId);
    });

  const cardFromAccount = (account: any, isClosed: boolean): DashboardCard => {
    const event = eventByPotId.get(String(account._id));
    const tripMoney = event?.tripMoney;
    const owner = tripMoney?.owner || account.owner;
    const members = tripMoney?.members || account.members;
    const recorded = tripMoney?.recordedTotal != null
      ? Number(tripMoney.recordedTotal)
      : contributionProgressTotal(account.financeRecords || [], paymentsForAccount(account._id));
    const target = Number(tripMoney?.targetAmount ?? account.targetAmount) || 0;
    return {
      id: String(account._id),
      name: event?.title || account.name,
      isClosed,
      targetAmount: target > 0 ? target : null,
      recordedTotal: recorded,
      yourContribution: Number(tripMoney?.yourContribution) || 0,
      memberCount: tripMoneyParticipantCount(owner, members),
      location: event?.location,
      eventDate: event?.eventDate,
      eventTime: event?.eventTime,
      ownedByCurrentUser: event ? event.ownedByCurrentUser !== false : undefined,
      eventId: event?._id,
      deletedAt: account.deletedAt || null,
      updatedAt: account.updatedAt || null,
      owner,
      members
    };
  };

  const cardFromEvent = (event: Event, isClosed: boolean): DashboardCard => {
    const tripMoney = event.tripMoney;
    return {
      id: String(tripMoney?._id),
      name: event.title,
      isClosed,
      targetAmount: Number(tripMoney?.targetAmount) || null,
      recordedTotal: Number(tripMoney?.recordedTotal) || 0,
      yourContribution: Number(tripMoney?.yourContribution) || 0,
      memberCount: tripMoneyParticipantCount(tripMoney?.owner, tripMoney?.members),
      location: event.location,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      ownedByCurrentUser: event.ownedByCurrentUser !== false,
      eventId: event._id,
      owner: tripMoney?.owner,
      members: tripMoney?.members
    };
  };

  const activeById = new Map<string, DashboardCard>();
  accountList.forEach((account) => {
    if (account?.isDeleted || !account?._id) return;
    activeById.set(String(account._id), cardFromAccount(account, false));
  });
  events.forEach((event) => {
    if (!event.tripMoney?._id || event.tripMoney.isDeleted) return;
    const id = String(event.tripMoney._id);
    if (!activeById.has(id)) {
      activeById.set(id, cardFromEvent(event, false));
    }
  });
  const activeCards = Array.from(activeById.values());

  const closedById = new Map<string, DashboardCard>();
  closedAccountList.forEach((account) => {
    if (!account?._id) return;
    closedById.set(String(account._id), cardFromAccount(account, true));
  });
  events.forEach((event) => {
    if (!event.tripMoney?._id || !event.tripMoney.isDeleted) return;
    const id = String(event.tripMoney._id);
    if (!closedById.has(id)) {
      closedById.set(id, cardFromEvent(event, true));
    }
  });
  const closedCards = sortClosedNewestFirst(Array.from(closedById.values()));
  const closedPreview = visibleClosedAccounts(closedCards, showMoreClosed);

  const renderAccountCard = (card: DashboardCard) => {
    const recorded = Number(card.recordedTotal) || 0;
    const target = Number(card.targetAmount) || 0;
    const yourRemaining = !card.isClosed
      ? personalRemaining(
          equalShareAmount(target, card.memberCount),
          Number(card.yourContribution) || 0
        )
      : null;
    const accountPayments = paymentsForAccount(card.id);
    const hasPendingPayment = accountPayments.some((pr: any) => pr.status === 'pending');
    const hasCompletedPayment = accountPayments.some((pr: any) => isCompletedPaymentStatus(pr.status));
    const showPayNow =
      !card.isClosed &&
      canPaySinglePayment(recorded, target, card.isClosed) &&
      !hasPendingPayment &&
      !hasCompletedPayment;
    const ownerId = typeof card.owner === 'object' && card.owner
      ? card.owner._id
      : card.owner;
    const isOrganiser = !!currentUserId && !!ownerId && String(ownerId) === String(currentUserId);
    const showCloseAccount = !card.isClosed && hasCompletedPayment && isOrganiser;

    const openAccount = () => navigate(`/shared-accounts/${card.id}`);
    const openPayNow = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/shared-accounts/${card.id}?pay=now`);
    };
    const openCloseAccount = (e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      navigate(`/shared-accounts/${card.id}?close=now`);
    };

    return (
      <div
        key={card.id}
        className="card trip-list-card"
        role="link"
        tabIndex={0}
        aria-label={`Open ${card.name}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.pay-now-cta, .close-shared-account-cta')) {
            return;
          }
          openAccount();
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) {
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openAccount();
          }
        }}
      >
        <div className="trip-list-card-header">
          <div>
            <h3 className="trip-list-title">{card.name}</h3>
            {card.isClosed && (
              <p className="trip-list-countdown">Closed</p>
            )}
            {!card.isClosed && card.eventDate && (
              <p className="trip-list-countdown">
                {tripCountdownLabel(card.eventDate)}
              </p>
            )}
            {card.location && (
              <p className="trip-list-location">{card.location}</p>
            )}
          </div>
        </div>

        {card.isClosed && (
          <p className="trip-list-money">Shared Account closed</p>
        )}
        {!card.isClosed && target > 0 && (
          <p className="trip-list-money">
            Target {formatGbp(target)}
            {' · '}
            {formatGbp(recorded)} contributed
            {' · Still needed '}
            {formatGbp(Math.max(0, target - recorded))}
            {card.memberCount > 0 && (
              <> · {card.memberCount} {card.memberCount === 1 ? 'member' : 'members'}</>
            )}
            {yourRemaining !== null && (
              <> · Your remaining: {formatGbp(yourRemaining)}</>
            )}
          </p>
        )}
        {!card.isClosed && !(target > 0) && recorded > 0 && (
          <p className="trip-list-money">
            {formatGbp(recorded)} contributed
          </p>
        )}
        {!card.isClosed && (hasPendingPayment || hasCompletedPayment || showPayNow || showCloseAccount) && (
          <div className="trip-list-card-actions">
            {hasPendingPayment && (
              <span className="trip-money-pending-badge">Waiting for approval</span>
            )}
            {hasCompletedPayment && (
              <span className="trip-money-pending-badge">Payment completed</span>
            )}
            {showPayNow && (
              <button
                type="button"
                className="btn btn-success pay-now-cta"
                onClick={openPayNow}
              >
                Pay now
              </button>
            )}
            {showCloseAccount && (
              <button
                type="button"
                className="btn btn-primary close-shared-account-cta"
                onClick={openCloseAccount}
              >
                Close Shared Account
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Shared Accounts</h1>
            <p style={{ margin: '0.35rem 0 0', color: '#4a5568', fontSize: '0.95rem' }}>
              Create and manage the accounts you share with other people.
            </p>
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem' }}>
              <Link to="/invitations" style={{ color: '#2b6cb0' }}>Invite members</Link>
            </p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Create Shared Account'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div>
              <strong>Error:</strong> {error}
              {error.includes('log in') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <a href="/login" style={{ color: '#3182ce', textDecoration: 'underline' }}>
                    Click here to log in
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Trip Form */}
      {showForm && (
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem' }}>Create Shared Account</h2>
          <p style={{ marginTop: 0, marginBottom: '1rem', color: '#4a5568', fontSize: '0.9rem' }}>
            Add a name, date, and target. After you create it you can invite members straight away.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="shared-account-name">Account name *</label>
              <input
                id="shared-account-name"
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Barcelona Holiday, Sarah's 30th Birthday, Festival Weekend"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tickets, shared meals, or whatever the group needs to track"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="shared-account-date">Date *</label>
              <input
                id="shared-account-date"
                type="date"
                className="form-input"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value, eventTime: '00:00' })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Barcelona, the venue, or leave blank"
              />
            </div>

            <div className="home-trip-money-fields">
              <h3 style={{ marginBottom: '0.35rem', color: '#495057' }}>Target</h3>
              <p style={{ marginTop: 0, marginBottom: '0.85rem', color: '#4a5568', fontSize: '0.9rem' }}>
                This is the group tracking target. No money is held by SHARE.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="trip-money-target">Target</label>
                <input
                  id="trip-money-target"
                  type="number"
                  className="form-input"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="1000"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                Recurring
              </label>
            </div>

            {formData.isRecurring && (
              <div className="form-group">
                <label className="form-label">Recurring Type</label>
                <select
                  className="form-input"
                  value={formData.recurringType}
                  onChange={(e) => setFormData({ ...formData, recurringType: e.target.value as any })}
                >
                  <option value="yearly">Yearly</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            )}

            {/* Budget Planning Section */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h3 style={{ marginBottom: '1rem', color: '#495057' }}>Personal budget</h3>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.budget?.isActive || false}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      budget: { 
                        ...formData.budget!, 
                        isActive: e.target.checked 
                      } 
                    })}
                  />
                  Enable budget planning
                </label>
              </div>

              {formData.budget?.isActive && (
                <>
                  <div className="grid grid-2">
                    <div className="form-group">
                      <label className="form-label">Total Budget Amount</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          className="form-input"
                          style={{ width: '80px' }}
                          value={formData.budget?.currency || 'GBP'}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            budget: { 
                              ...formData.budget!, 
                              currency: e.target.value 
                            } 
                          })}
                        >
                          <option value="GBP">GBP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          value={formData.budget?.totalAmount || ''}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            budget: { 
                              ...formData.budget!, 
                              totalAmount: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Savings Frequency</label>
                      <select
                        className="form-input"
                        value={formData.budget?.savingsFrequency || 'monthly'}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          budget: { 
                            ...formData.budget!, 
                            savingsFrequency: e.target.value as any 
                          } 
                        })}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  {formData.budget?.totalAmount > 0 && formData.eventDate && (
                    <div style={{ 
                      background: '#e3f2fd', 
                      padding: '1rem', 
                      borderRadius: '6px', 
                      marginTop: '1rem',
                      border: '1px solid #bbdefb'
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>Savings Plan</h4>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                        <strong>Amount to save per {formData.budget?.savingsFrequency}:</strong> 
                        <span style={{ color: '#1976d2', fontWeight: 'bold' }}>
                          {formData.budget?.currency} {calculateAmountPerPeriod()}
                        </span>
                      </p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                        <strong>Total periods:</strong> {calculatePeriodsLeft()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? <span className="spinner"></span> : 'Create Shared Account'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Active Shared Accounts</h2>
        {activeCards.length === 0 ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginTop: 0, fontSize: '1.05rem' }}>
              No shared accounts yet. Create one to start collecting toward a target.
            </p>
            <p style={{ marginBottom: 0, fontSize: '0.9rem' }}>
              Holidays, birthdays, festivals, group bookings, or any shared cost.
            </p>
          </div>
        ) : (
          <div className="grid grid-1">
            {activeCards.map(renderAccountCard)}
          </div>
        )}
      </div>

      {closedCards.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Recently Closed</h2>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: 0 }}>
            Read-only history. Closed accounts stay available here.
          </p>
          <div className="grid grid-1">
            {closedPreview.map(renderAccountCard)}
          </div>
          {closedCards.length > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => setShowMoreClosed((open) => !open)}
            >
              {showMoreClosed ? 'Show fewer closed accounts ▲' : 'Show more closed accounts ▼'}
            </button>
          )}
          <p style={{ margin: '0.85rem 0 0' }}>
            <Link to="/shared-accounts?archived=1" style={{ color: '#2b6cb0' }}>
              View all closed accounts
            </Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default EventCountdown;
