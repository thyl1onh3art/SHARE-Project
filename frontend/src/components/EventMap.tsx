import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Event {
  _id: string;
  title: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

const EventMap: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetchEvents();
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [searchTerm, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/events');
      const eventsData = response.data;
      
      // Geocode events that don't have coordinates
      const eventsWithCoords = await Promise.all(
        eventsData.map(async (event: Event) => {
          if (event.latitude && event.longitude) {
            return event;
          }
          if (event.address || event.location) {
            try {
              const coords = await geocodeAddress(event.address || event.location || '');
              return { ...event, ...coords };
            } catch {
              return event;
            }
          }
          return event;
        })
      );
      
      setEvents(eventsWithCoords);
      setFilteredEvents(eventsWithCoords);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => {
      setError('Failed to load Google Maps. Please check your API key.');
      setMapLoaded(false);
    };
    document.head.appendChild(script);
  };

  const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    if (!window.google || !window.google.maps) return null;

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            latitude: location.lat(),
            longitude: location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  };

  useEffect(() => {
    if (mapLoaded && mapRef.current && filteredEvents.length > 0) {
      const eventsWithCoords = filteredEvents.filter(e => e.latitude && e.longitude);
      
      if (eventsWithCoords.length === 0) {
        // Center on default location (London, UK)
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 6,
          center: { lat: 51.5074, lng: -0.1278 }
        });
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      const markers: any[] = [];

      eventsWithCoords.forEach((event) => {
        const position = { lat: event.latitude!, lng: event.longitude! };
        bounds.extend(position);

        const marker = new window.google.maps.Marker({
          position,
          map: null, // Will be set after map creation
          title: event.title,
          label: {
            text: event.title.substring(0, 1).toUpperCase(),
            color: 'white',
            fontWeight: 'bold'
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 0.5rem;">
              <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">${event.title}</h3>
              <p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;">
                ${new Date(`${event.eventDate}T${event.eventTime}`).toLocaleString()}
              </p>
              ${event.address ? `<p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;">${event.address}</p>` : ''}
              ${event.location ? `<p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;">${event.location}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(marker.getMap(), marker);
          setSelectedEvent(event);
        });

        markers.push(marker);
      });

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: eventsWithCoords.length === 1 ? 12 : undefined,
        center: bounds.getCenter()
      });

      if (eventsWithCoords.length > 1) {
        map.fitBounds(bounds);
      }

      markers.forEach(marker => marker.setMap(map));
    }
  }, [mapLoaded, filteredEvents]);

  if (loading) {
    return (
      <div className="card">
        <p>Loading events map...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h1 className="card-title">Event Locations Map</h1>
        <p style={{ color: '#4a5568', marginBottom: '1rem' }}>
          Search and view your events on an interactive map. Click on markers to see event details.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Search Events</label>
          <input
            type="text"
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event name, location, or address..."
          />
        </div>
      </div>

      {/* Map Container */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '600px',
            minHeight: '400px',
            background: '#e2e8f0'
          }}
        >
          {!mapLoaded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#4a5568'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto 1rem' }}></div>
                <p>Loading map...</p>
                {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY && (
                  <p style={{ fontSize: '0.85rem', color: '#e53e3e', marginTop: '0.5rem' }}>
                    Note: Google Maps API key not configured. Map will not display.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>
            Events ({filteredEvents.length})
          </h2>
          <div className="grid grid-2">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className="card"
                style={{
                  margin: 0,
                  cursor: 'pointer',
                  border: selectedEvent?._id === event._id ? '2px solid #667eea' : '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedEvent(event)}
              >
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>{event.title}</h3>
                <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                  <strong>Date:</strong> {new Date(`${event.eventDate}T${event.eventTime}`).toLocaleString()}
                </p>
                {event.location && (
                  <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                    <strong>Location:</strong> {event.location}
                  </p>
                )}
                {event.address && (
                  <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                    <strong>Address:</strong> {event.address}
                  </p>
                )}
                {event.latitude && event.longitude ? (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#38a169' }}>
                    ✓ Location on map
                  </p>
                ) : (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#e53e3e' }}>
                    ⚠ No coordinates - add address to show on map
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredEvents.length === 0 && !loading && (
        <div className="card">
          <p style={{ color: '#4a5568', textAlign: 'center' }}>
            {searchTerm ? 'No events found matching your search.' : 'No events found. Create events to see them on the map.'}
          </p>
        </div>
      )}
    </div>
  );
};

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

export default EventMap;

