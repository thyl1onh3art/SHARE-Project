import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Accommodation {
  name: string;
  address: string;
  price?: number;
  rating?: number;
  distance?: number;
  type: string;
  bookingLink?: string;
  imageUrl?: string;
}

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  location?: string;
  address?: string;
}

const Accommodations: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState(5); // km

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/events');
      setEvents(response.data);
      if (response.data.length > 0) {
        setSelectedEvent(response.data[0]);
        setSearchLocation(response.data[0].location || response.data[0].address || '');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const searchAccommodations = async () => {
    if (!searchLocation.trim()) {
      setError('Please enter a location or select an event');
      return;
    }

    setSearching(true);
    setError('');

    try {
      // For now, we'll use a mock/placeholder API
      // In production, you'd integrate with Booking.com API, Google Places API, or similar
      const response = await axios.post('/accommodations/search', {
        location: searchLocation,
        radius: searchRadius,
        eventDate: selectedEvent?.eventDate
      });

      setAccommodations(response.data);
    } catch (err: any) {
      // If endpoint doesn't exist, show mock data for demonstration
      console.log('Accommodations API not available, showing mock data');
      setAccommodations(getMockAccommodations());
    } finally {
      setSearching(false);
    }
  };

  const getMockAccommodations = (): Accommodation[] => {
    // Mock accommodations for demonstration
    // In production, replace with real API data
    return [
      {
        name: 'Grand Hotel',
        address: '123 Main Street, ' + searchLocation,
        price: 120,
        rating: 4.5,
        distance: 0.5,
        type: 'hotel',
        bookingLink: 'https://booking.com',
        imageUrl: undefined
      },
      {
        name: 'Cozy B&B',
        address: '456 Oak Avenue, ' + searchLocation,
        price: 80,
        rating: 4.2,
        distance: 1.2,
        type: 'bed and breakfast',
        bookingLink: 'https://booking.com',
        imageUrl: undefined
      },
      {
        name: 'Budget Hostel',
        address: '789 Pine Road, ' + searchLocation,
        price: 35,
        rating: 3.8,
        distance: 2.1,
        type: 'hostel',
        bookingLink: 'https://booking.com',
        imageUrl: undefined
      },
      {
        name: 'Luxury Resort',
        address: '321 Beach Boulevard, ' + searchLocation,
        price: 250,
        rating: 4.8,
        distance: 3.5,
        type: 'resort',
        bookingLink: 'https://booking.com',
        imageUrl: undefined
      }
    ];
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setSearchLocation(event.location || event.address || '');
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading accommodations...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#718096' }}>
          Secondary · More menu
        </p>
        <h1 className="card-title" style={{ marginBottom: '0.35rem' }}>Places to stay</h1>
        <p style={{ color: '#4a5568', marginBottom: '0.5rem' }}>
          Find stays near a location. Keep shared deposits and group costs in a Shared Account; invite members from Notifications.
        </p>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <Link to="/events" style={{ color: '#2b6cb0' }}>Shared Accounts</Link>
          {' · '}
          <Link to="/invitations" style={{ color: '#2b6cb0' }}>Notifications</Link>
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Search places to stay</h2>
        
        <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Select Shared Account (Optional)</label>
            <select
              className="form-input"
              value={selectedEvent?._id || ''}
              onChange={(e) => {
                const event = events.find(ev => ev._id === e.target.value);
                if (event) handleEventSelect(event);
              }}
            >
              <option value="">No Shared Account selected</option>
              {events.map(event => (
                <option key={event._id} value={event._id}>
                  {event.title} - {new Date(event.eventDate).toLocaleDateString()}
                  {event.location && ` (${event.location})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Search Location</label>
            <input
              type="text"
              className="form-input"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="Enter city, address, or location..."
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Search Radius: {searchRadius} km</label>
          <input
            type="range"
            min="1"
            max="50"
            value={searchRadius}
            onChange={(e) => setSearchRadius(parseInt(e.target.value))}
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>

        <button
          onClick={searchAccommodations}
          className="btn btn-primary"
          disabled={searching || !searchLocation.trim()}
          style={{ width: '100%' }}
        >
          {searching ? <span className="spinner"></span> : 'Search places to stay'}
        </button>
      </div>

      {/* Results */}
      {accommodations.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>
            Accommodations Near {searchLocation} ({accommodations.length} found)
          </h2>
          
          <div className="grid grid-2">
            {accommodations.map((accommodation, index) => (
              <div key={index} className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: '#2d3748' }}>{accommodation.name}</h3>
                  {accommodation.rating && (
                    <div style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      ⭐ {accommodation.rating}
                    </div>
                  )}
                </div>

                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                  📍 {accommodation.address}
                </p>

                {accommodation.distance && (
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                    📏 {accommodation.distance.toFixed(1)} km away
                  </p>
                )}

                {accommodation.price && (
                  <p style={{ color: '#2b6cb0', fontSize: '1.1rem', fontWeight: '600', margin: '0.5rem 0' }}>
                    £{accommodation.price.toFixed(2)}/night
                  </p>
                )}

                <p style={{ color: '#718096', fontSize: '0.85rem', margin: '0.25rem 0', textTransform: 'capitalize' }}>
                  Type: {accommodation.type}
                </p>

                {accommodation.bookingLink && (
                  <a
                    href={accommodation.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center' }}
                  >
                    View & Book
                  </a>
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px'
          }}>
            <p style={{ color: '#0369a1', fontSize: '0.85rem', margin: 0 }}>
              <strong>Note:</strong> Place suggestions here are sample results for planning — not live bookings. 
              To enable real-time search, integrate with Booking.com API, Google Places API, or similar service.
            </p>
          </div>
        </div>
      )}

      {accommodations.length === 0 && !searching && (
        <div className="card">
          <p style={{ color: '#4a5568', textAlign: 'center' }}>
            Enter a destination and search for nearby places to stay — then track any shared deposit in a Shared Account.
          </p>
        </div>
      )}
    </div>
  );
};

export default Accommodations;

