import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { tripMoneyPrimaryAction, TripHomeEvent } from '../utils/tripHome';

/** Bookmark-safe redirect: /events/:id is not a working page. */
const TripHome: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const redirect = async () => {
      if (!eventId) {
        setError('Trip not found');
        return;
      }

      try {
        const response = await axios.get<TripHomeEvent>(`/events/${eventId}`);
        const trip = response.data;
        const action = tripMoneyPrimaryAction(trip._id || eventId, trip.title, trip.tripMoney);
        navigate(action.to, { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Could not load this trip.');
      }
    };

    redirect();
  }, [eventId, navigate]);

  if (error) {
    return (
      <div className="card">
        <p style={{ marginTop: 0 }}>{error}</p>
        <Link to="/events">Back to trips</Link>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
      <p style={{ marginTop: '1rem', color: '#4a5568' }}>Opening trip...</p>
    </div>
  );
};

export default TripHome;
