import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  equalShareAmount,
  formatGbp,
  personalRemaining,
  tripCountdownLabel,
  tripMoneyParticipantCount,
  tripMoneyPrimaryAction,
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Event>({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
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
  const [legacyPots, setLegacyPots] = useState<Array<{
    _id: string;
    name: string;
    isDeleted?: boolean;
    targetAmount?: number;
    event?: string | null;
  }>>([]);
  const [targetAmount, setTargetAmount] = useState('');
  const [showArchived, setShowArchived] = useState(false);

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
    fetchLegacyPots();
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

  const fetchLegacyPots = async () => {
    try {
      const [activeResponse, archivedResponse] = await Promise.all([
        axios.get('/shared-accounts'),
        axios.get('/shared-accounts?archived=true').catch(() => ({ data: [] }))
      ]);
      const combined = [
        ...(Array.isArray(activeResponse.data) ? activeResponse.data : []),
        ...(Array.isArray(archivedResponse.data) ? archivedResponse.data : [])
      ];
      const seen = new Set<string>();
      setLegacyPots(combined.filter((pot: { _id?: string; event?: string | null }) => {
        if (pot.event || !pot._id || seen.has(pot._id)) {
          return false;
        }
        seen.add(pot._id);
        return true;
      }));
    } catch {
      setLegacyPots([]);
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Shared Account?')) {
      return;
    }

    try {
      await axios.delete(`/events/${id}`);
      fetchEvents();
    } catch (err: any) {
      setError(`Failed to delete Shared Account: ${err.response?.data?.message || err.message}`);
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

  const isArchivedAccount = (event: Event) => !!event.tripMoney?.isDeleted;
  const activeEvents = events.filter((event) => !isArchivedAccount(event));
  const archivedEvents = events.filter(isArchivedAccount);

  const renderAccountCard = (event: Event) => {
    const recorded = Number(event.tripMoney?.recordedTotal) || 0;
    const target = Number(event.tripMoney?.targetAmount) || 0;
    const yourRemaining = event.tripMoney && !event.tripMoney.isDeleted
      ? personalRemaining(
          equalShareAmount(
            target,
            tripMoneyParticipantCount(event.tripMoney.owner, event.tripMoney.members)
          ),
          Number(event.tripMoney.yourContribution) || 0
        )
      : null;
    const destination = tripMoneyPrimaryAction(
      event._id || '',
      event.title,
      event.tripMoney
    ).to;
    const memberCount = event.tripMoney
      ? tripMoneyParticipantCount(event.tripMoney.owner, event.tripMoney.members)
      : 0;

    const openAccount = () => {
      if (destination) {
        navigate(destination);
      }
    };

    return (
      <div
        key={event._id || event.title}
        className="card trip-list-card"
        role="link"
        tabIndex={0}
        aria-label={`Open ${event.title}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.trip-list-remove')) {
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
            <h3 className="trip-list-title">{event.title}</h3>
            <p className="trip-list-countdown">
              {tripCountdownLabel(event.eventDate, event.eventTime)}
            </p>
            {event.location && (
              <p className="trip-list-location">{event.location}</p>
            )}
          </div>
          {event.ownedByCurrentUser !== false && (
            <button
              type="button"
              onClick={() => handleDelete(event._id || '')}
              className="btn btn-secondary trip-list-remove"
            >
              Remove
            </button>
          )}
        </div>

        {event.tripMoney?.isDeleted && (
          <p className="trip-list-money">Shared Account closed</p>
        )}
        {event.tripMoney && !event.tripMoney.isDeleted && target > 0 && (
          <p className="trip-list-money">
            Target {formatGbp(target)}
            {' · '}
            {formatGbp(recorded)} contributed
            {' · Still needed '}
            {formatGbp(Math.max(0, target - recorded))}
            {memberCount > 0 && (
              <> · {memberCount} {memberCount === 1 ? 'member' : 'members'}</>
            )}
            {yourRemaining !== null && (
              <> · Your remaining: {formatGbp(yourRemaining)}</>
            )}
          </p>
        )}
        {!event.tripMoney && (
          <p className="trip-list-money">Shared Account not set up yet</p>
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
                placeholder="Accommodation deposit, tickets, shared costs — whatever the group needs to track"
                rows={3}
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Start time *</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                  required
                />
              </div>
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

            {/* Accommodation Section */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h3 style={{ marginBottom: '1rem', color: '#495057' }}>Accommodation</h3>
              
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Accommodation Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.accommodation?.name || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      accommodation: { 
                        ...formData.accommodation!, 
                        name: e.target.value 
                      } 
                    })}
                    placeholder="e.g., Marriott Hotel"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={formData.accommodation?.type || 'hotel'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      accommodation: { 
                        ...formData.accommodation!, 
                        type: e.target.value as any 
                      } 
                    })}
                  >
                    <option value="hotel">Hotel</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="hostel">Hostel</option>
                    <option value="resort">Resort</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Price per Night</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.accommodation?.price || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      accommodation: { 
                        ...formData.accommodation!, 
                        price: parseFloat(e.target.value) || 0 
                      } 
                    })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Booking Link</label>
                  <input
                    type="url"
                    className="form-input"
                    value={formData.accommodation?.bookingLink || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      accommodation: { 
                        ...formData.accommodation!, 
                        bookingLink: e.target.value 
                      } 
                    })}
                    placeholder="https://booking.com/..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={formData.accommodation?.notes || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    accommodation: { 
                      ...formData.accommodation!, 
                      notes: e.target.value 
                    } 
                  })}
                  placeholder="Any special requirements or notes..."
                  rows={2}
                />
              </div>
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
        {activeEvents.length === 0 ? (
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
            {activeEvents.map(renderAccountCard)}
          </div>
        )}
      </div>

      {archivedEvents.length > 0 && (
        <div className="card">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowArchived((open) => !open)}
          >
            {showArchived ? 'Hide archived accounts' : 'Show archived accounts'}
          </button>
          {showArchived && (
            <div className="grid grid-1" style={{ marginTop: '1rem' }}>
              {archivedEvents.map(renderAccountCard)}
            </div>
          )}
        </div>
      )}

      {legacyPots.length > 0 && (
        <div className="card legacy-trip-money">
          <h2 className="legacy-trip-money-title">Older Accounts</h2>
          <p className="legacy-trip-money-note">
            Older shared accounts that are not linked from the main list. They stay available here.
          </p>
          <div className="grid grid-1">
            {legacyPots.map((pot) => (
              <button
                key={pot._id}
                type="button"
                className="legacy-trip-money-item"
                onClick={() => navigate(`/shared-accounts/${pot._id}`)}
              >
                <span>{pot.name}</span>
                <span className="legacy-trip-money-meta">
                  {pot.isDeleted ? 'Closed' : pot.targetAmount ? formatGbp(pot.targetAmount) : 'Open'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCountdown;
