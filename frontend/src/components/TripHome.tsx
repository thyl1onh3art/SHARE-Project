import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  formatContributionDeadline,
  formatGbp,
  tripCountdownLabel,
  tripGroupMembers,
  tripMoneyPrimaryAction,
  TripHomeEvent
} from '../utils/tripHome';

const TripHome: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [trip, setTrip] = useState<TripHomeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrip = async () => {
      if (!eventId) {
        setError('Trip not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`/events/${eventId}`);
        setTrip(response.data);
      } catch (err: any) {
        setTrip(null);
        setError(err.response?.data?.message || 'Could not load this trip.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [eventId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading trip...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="card">
        <p style={{ marginTop: 0 }}>{error || 'Trip not found'}</p>
        <Link to="/events">Back to trips</Link>
      </div>
    );
  }

  const tripMoney = trip.tripMoney || null;
  const action = tripMoneyPrimaryAction(trip._id || eventId || '', trip.title, tripMoney);
  const members = tripGroupMembers(trip);
  const recorded = Number(tripMoney?.recordedTotal) || 0;
  const target = Number(tripMoney?.targetAmount) || 0;
  const hasTarget = target > 0;
  const percent = hasTarget ? Math.min(100, Math.max(0, (recorded / target) * 100)) : 0;
  const deadline = formatContributionDeadline(tripMoney?.targetDate);
  const yourContribution = tripMoney && typeof tripMoney.yourContribution === 'number'
    ? tripMoney.yourContribution
    : null;

  return (
    <div className="trip-home">
      <p className="trip-home-back">
        <Link to="/events">Back to trips</Link>
      </p>

      <section className="trip-home-hero">
        <h1 className="trip-home-title">{trip.title}</h1>
        <p className="trip-home-countdown">{tripCountdownLabel(trip.eventDate, trip.eventTime)}</p>
        {trip.location && <p className="trip-home-location">{trip.location}</p>}
      </section>

      {tripMoney && (
        <section className="trip-home-card" aria-label="Trip Money summary">
          {tripMoney.isDeleted && (
            <p className="trip-home-closed">Trip Money closed</p>
          )}
          {hasTarget ? (
            <>
              <p className="trip-home-money-total">
                {formatGbp(recorded)} of {formatGbp(target)} contributed
              </p>
              <div className="trip-money-progress-track" aria-hidden="true">
                <div className="trip-money-progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </>
          ) : (
            <p className="trip-home-money-total">
              {formatGbp(recorded)} contributed
            </p>
          )}
          {yourContribution !== null && (
            <p className="trip-home-your-contribution">
              Your contribution: {formatGbp(yourContribution)}
            </p>
          )}
          {deadline && !tripMoney.isDeleted && (
            <p className="trip-home-deadline">Contribution deadline: {deadline}</p>
          )}
        </section>
      )}

      <div className="trip-home-primary">
        <Link to={action.to} className="btn btn-primary trip-home-cta">
          {action.label}
        </Link>
      </div>

      {members.length > 0 && (
        <section className="trip-home-card" aria-label="Group">
          <h2 className="trip-home-section-title">Group</h2>
          <ul className="trip-home-group">
            {members.map((member) => (
              <li key={member.id} className="trip-home-member">
                <span className="trip-home-avatar" aria-hidden="true">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span>{member.name}</span>
                {member.isOrganiser && (
                  <span className="trip-home-organiser">Organiser</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="trip-home-supporting" aria-label="More for this trip">
        <Link to="/gallery">Photos</Link>
        <Link to="/map">Map</Link>
      </nav>
    </div>
  );
};

export default TripHome;
