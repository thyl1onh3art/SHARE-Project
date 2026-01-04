import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import EventCountdown from './EventCountdown';

interface Event {
  _id?: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  category: string;
  isShared?: boolean;
  sharedWith?: string[];
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface CalendarView {
  type: 'month' | 'week' | 'day' | 'countdown';
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<CalendarView['type']>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [sharedEvents, setSharedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSharingSettings, setShowSharingSettings] = useState(false);
  const [calendarPrivacy, setCalendarPrivacy] = useState<'private' | 'shared'>('private');
  const [sharedWithUsers, setSharedWithUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchSharedEvents();
    fetchCalendarSettings();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/events');
      setEvents(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedEvents = async () => {
    try {
      // Fetch events shared with this user
      const response = await axios.get('/events/shared');
      setSharedEvents(response.data || []);
    } catch (err: any) {
      // If endpoint doesn't exist, that's okay
      console.log('Shared events endpoint not available');
    }
  };

  const fetchCalendarSettings = async () => {
    try {
      // Fetch user's calendar privacy settings
      const response = await axios.get('/users/calendar-settings');
      if (response.data) {
        setCalendarPrivacy(response.data.privacy || 'private');
        setSharedWithUsers(response.data.sharedWith || []);
      }
    } catch (err: any) {
      // If endpoint doesn't exist, use defaults
      console.log('Calendar settings endpoint not available');
    }
  };

  const updateCalendarPrivacy = async (privacy: 'private' | 'shared') => {
    try {
      await axios.put('/users/calendar-settings', {
        privacy,
        sharedWith: sharedWithUsers
      });
      setCalendarPrivacy(privacy);
      setShowSharingSettings(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update calendar settings');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const userEvents = events.filter(e => e.eventDate === dateStr);
    const shared = sharedEvents.filter(e => e.eventDate === dateStr);
    return [...userEvents, ...shared];
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} style={{ minHeight: '100px', border: '1px solid #e2e8f0' }}></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          style={{
            minHeight: '100px',
            border: '1px solid #e2e8f0',
            padding: '0.5rem',
            background: isToday ? '#f0f9ff' : 'white',
            position: 'relative'
          }}
        >
          <div style={{
            fontWeight: isToday ? 'bold' : 'normal',
            color: isToday ? '#0284c7' : '#4a5568',
            marginBottom: '0.25rem'
          }}>
            {day}
          </div>
          <div style={{ fontSize: '0.75rem' }}>
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                title={event.title}
                style={{
                  background: '#667eea',
                  color: 'white',
                  padding: '0.125rem 0.25rem',
                  borderRadius: '4px',
                  marginBottom: '0.125rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div style={{ color: '#667eea', fontSize: '0.7rem', marginTop: '0.125rem' }}>
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0,
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                padding: '0.75rem',
                background: '#f7fafc',
                fontWeight: '600',
                textAlign: 'center',
                borderBottom: '2px solid #e2e8f0',
                color: '#4a5568'
              }}
            >
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      weekDays.push(
        <div
          key={i}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            background: isToday ? '#f0f9ff' : 'white',
            minHeight: '400px'
          }}
        >
          <div style={{
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: isToday ? '#0284c7' : '#4a5568',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.5rem'
          }}>
            {dayNames[i]}
            <div style={{ fontSize: '0.85rem', fontWeight: 'normal', color: '#718096' }}>
              {date.toLocaleDateString()}
            </div>
          </div>
          <div>
            {dayEvents.length === 0 ? (
              <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>No events</p>
            ) : (
              dayEvents.map((event) => (
                <div
                  key={event._id}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{event.title}</div>
                  {event.eventTime && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {event.eventTime}
                    </div>
                  )}
                  {event.location && (
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      📍 {event.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
        {weekDays}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {isToday && <span style={{ color: '#0284c7', marginLeft: '0.5rem' }}>(Today)</span>}
        </h2>
        {dayEvents.length === 0 ? (
          <p style={{ color: '#a0aec0' }}>No events scheduled for this day</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dayEvents.map((event) => (
              <div key={event._id} className="card" style={{ margin: 0 }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                <p style={{ color: '#4a5568', margin: '0.25rem 0' }}>
                  <strong>Time:</strong> {event.eventTime}
                </p>
                {event.location && (
                  <p style={{ color: '#4a5568', margin: '0.25rem 0' }}>
                    <strong>Location:</strong> {event.location}
                  </p>
                )}
                {event.description && (
                  <p style={{ color: '#4a5568', margin: '0.5rem 0 0 0' }}>{event.description}</p>
                )}
                {event.isShared && (
                  <p style={{ color: '#667eea', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                    🔗 Shared event
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (view === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Calendar</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setShowSharingSettings(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {calendarPrivacy === 'shared' ? '🔗 Shared' : '🔒 Private'}
            </button>
            <button
              onClick={() => setView('countdown')}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              Countdown View
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {view === 'countdown' ? (
        <EventCountdown />
      ) : (
        <>
          {/* View Controls */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setView('month')}
                  className={view === 'month' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  className={view === 'week' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Week
                </button>
                <button
                  onClick={() => setView('day')}
                  className={view === 'day' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Day
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => navigateDate('prev')}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  ←
                </button>
                <button
                  onClick={goToToday}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  Today
                </button>
                <button
                  onClick={() => navigateDate('next')}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  →
                </button>
              </div>

              <div style={{ fontWeight: '600', color: '#2d3748' }}>
                {view === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {view === 'week' && `Week of ${new Date(currentDate.getTime() - currentDate.getDay() * 24 * 60 * 60 * 1000).toLocaleDateString()}`}
                {view === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Calendar View */}
          <div className="card">
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </div>
        </>
      )}

      {/* Sharing Settings Modal */}
      {showSharingSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Calendar Privacy Settings</h2>
              <button
                onClick={() => setShowSharingSettings(false)}
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

            <div className="form-group">
              <label className="form-label">Calendar Visibility</label>
              <select
                className="form-input"
                value={calendarPrivacy}
                onChange={(e) => setCalendarPrivacy(e.target.value as 'private' | 'shared')}
              >
                <option value="private">Private - Only I can see my calendar</option>
                <option value="shared">Shared - Others can see my calendar</option>
              </select>
            </div>

            {calendarPrivacy === 'shared' && (
              <div className="form-group">
                <label className="form-label">Share with (Email addresses, comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="user1@example.com, user2@example.com"
                  value={sharedWithUsers.join(', ')}
                  onChange={(e) => setSharedWithUsers(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Enter email addresses of users you want to share your calendar with
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => setShowSharingSettings(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => updateCalendarPrivacy(calendarPrivacy)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;

