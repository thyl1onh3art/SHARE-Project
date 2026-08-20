import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

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
  createdAt?: string;
  updatedAt?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EventCountdown: React.FC = () => {
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
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: TimeLeft }>({});

  // Keep category values aligned with the existing Event API/model; only labels are trip-oriented.
  const categories = [
    { value: 'holiday', label: 'Group holiday' },
    { value: 'travel', label: 'City break / travel' },
    { value: 'social', label: 'Friends trip' },
    { value: 'sports', label: 'Ski / sports trip' },
    { value: 'concert', label: 'Festival / tickets trip' },
    { value: 'birthday', label: 'Birthday getaway' },
    { value: 'anniversary', label: 'Anniversary trip' },
    { value: 'work', label: 'Work trip' },
    { value: 'other', label: 'Other trip' }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view your trips');
      } else {
        setError(`Failed to load trips: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeLeft = (eventDate: string, eventTime: string): TimeLeft => {
    const now = new Date();
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    
    // If the event is in the past and not recurring, return zeros
    if (eventDateTime <= now) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const difference = eventDateTime.getTime() - now.getTime();
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  };

  const updateCountdowns = () => {
    const newTimeLeft: { [key: string]: TimeLeft } = {};
    events.forEach(event => {
      newTimeLeft[event._id || event.title] = calculateTimeLeft(event.eventDate, event.eventTime);
    });
    setTimeLeft(newTimeLeft);
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
    setSubmitting(true);

    try {
      await axios.post('/events', formData);
      setFormData({
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
      setShowForm(false);
      fetchEvents();
    } catch (err: any) {
      setError(`Failed to create trip: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await axios.delete(`/events/${id}`);
      fetchEvents();
    } catch (err: any) {
      setError(`Failed to delete trip: ${err.response?.data?.message || err.message}`);
    }
  };

  const formatTimeLeft = (time: TimeLeft): string => {
    if (time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0) {
      return 'Trip has passed';
    }
    return `${time.days}d ${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };


  const isEventUpcoming = (time: TimeLeft): boolean => {
    return !(time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading trips...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Trips</h1>
            <p style={{ margin: '0.35rem 0 0', color: '#4a5568', fontSize: '0.95rem' }}>
              Plan the group holiday in one place — destination, dates, and shared trip costs.
            </p>
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem' }}>
              <Link to="/invitations" style={{ color: '#2b6cb0' }}>Invite travellers</Link>
              {' · '}
              <Link to="/shared-accounts" style={{ color: '#2b6cb0' }}>Trip Money</Link>
            </p>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            {showForm ? 'Cancel' : 'Add trip'}
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
          <h2 style={{ marginBottom: '0.5rem' }}>Add a trip</h2>
          <p style={{ marginTop: 0, marginBottom: '1rem', color: '#4a5568', fontSize: '0.9rem' }}>
            Examples: Amsterdam weekend, Ibiza trip, ski holiday, stag/hen trip, or a friends group holiday.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Trip name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Amsterdam weekend, Ibiza trip, ski holiday"
              />
            </div>

            <div className="form-group">
              <label className="form-label">What is this trip for?</label>
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
                <label className="form-label">Trip date *</label>
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
              <label className="form-label">Destination</label>
              <input
                type="text"
                className="form-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Amsterdam, Ibiza, Chamonix"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trip type</label>
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
                Recurring trip
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
              <h3 style={{ marginBottom: '1rem', color: '#495057' }}>Trip budget</h3>
              
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
                  Enable trip budget planning
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
              {submitting ? <span className="spinner"></span> : 'Save trip'}
            </button>
          </form>
        </div>
      )}

      {/* Trips List */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Your trips</h2>
        
        {events.length === 0 ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginTop: 0, fontSize: '1.05rem' }}>
              No trips yet. Add your first group trip to get started.
            </p>
            <p style={{ marginBottom: 0, fontSize: '0.9rem' }}>
              Try an Amsterdam weekend, Ibiza trip, ski holiday, stag/hen trip, or friends group holiday.
            </p>
          </div>
        ) : (
          <div className="grid grid-1">
            {events.map((event) => {
              const time = timeLeft[event._id || event.title] || { days: 0, hours: 0, minutes: 0, seconds: 0 };
              const isUpcoming = isEventUpcoming(time);
              
              return (
                <div key={event._id || event.title} className="card" style={{ margin: 0, marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>{event.title}</h3>
                    </div>
                    <button
                      onClick={() => handleDelete(event._id || '')}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                  
                  {event.description && (
                    <p style={{ color: '#4a5568', marginBottom: '1rem' }}>{event.description}</p>
                  )}
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                      <strong>Date:</strong> {new Date(`${event.eventDate}T${event.eventTime}`).toLocaleString()}
                    </p>
                    {event.location && (
                      <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                        <strong>Destination:</strong> {event.location}
                      </p>
                    )}
                    {event.isRecurring && (
                      <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                        <strong>Recurring:</strong> {event.recurringType}
                      </p>
                    )}
                    
                    {/* Budget Information */}
                    {event.budget?.isActive && event.budget.totalAmount > 0 && (
                      <div style={{ 
                        background: '#e8f5e8', 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        marginTop: '0.5rem',
                        border: '1px solid #c8e6c9'
                      }}>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#2e7d32' }}>
                          <strong>Budget:</strong> {event.budget.currency} {event.budget.totalAmount.toLocaleString()}
                        </p>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#2e7d32' }}>
                          <strong>Save per {event.budget.savingsFrequency}:</strong> {event.budget.currency} {event.budget.amountPerPeriod}
                        </p>
                      </div>
                    )}
                    
                    {/* Accommodation Information */}
                    {event.accommodation?.name && (
                      <div style={{ 
                        background: '#fff3e0', 
                        padding: '0.75rem', 
                        borderRadius: '6px', 
                        marginTop: '0.5rem',
                        border: '1px solid #ffcc02'
                      }}>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#e65100' }}>
                          <strong>{event.accommodation.name}</strong> ({event.accommodation.type})
                        </p>
                        {event.accommodation.price > 0 && (
                          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#e65100' }}>
                            <strong>Price:</strong> {event.budget?.currency || 'GBP'} {event.accommodation.price}/night
                          </p>
                        )}
                        {event.accommodation.bookingLink && (
                          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                            <a href={event.accommodation.bookingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>
                              View Booking
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: isUpcoming ? '#f0f9ff' : '#fef3c7',
                    border: `1px solid ${isUpcoming ? '#bae6fd' : '#f59e0b'}`,
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: isUpcoming ? '#0369a1' : '#92400e',
                      marginBottom: '0.5rem'
                    }}>
                      {isUpcoming ? 'Time until trip' : 'Trip passed'}
                    </div>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: isUpcoming ? '#0369a1' : '#92400e',
                      fontFamily: 'monospace'
                    }}>
                      {formatTimeLeft(time)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-3">
        <div className="card">
          <h3 style={{ color: '#2b6cb0', marginBottom: '1rem' }}>Total trips</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2b6cb0' }}>
            {events.length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#38a169', marginBottom: '1rem' }}>Upcoming</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38a169' }}>
            {events.filter(event => {
              const time = timeLeft[event._id || event.title] || { days: 0, hours: 0, minutes: 0, seconds: 0 };
              return isEventUpcoming(time);
            }).length}
          </p>
        </div>
        
        <div className="card">
          <h3 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Recurring</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e53e3e' }}>
            {events.filter(event => event.isRecurring).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventCountdown;
