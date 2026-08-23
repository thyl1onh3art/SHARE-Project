import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { formatPersonalBalanceGbp, personalBalanceFromRecords } from '../utils/personalBalance';
import { userFacingError } from '../utils/userFacingError';

const Home: React.FC = () => {
  const [personalBalance, setPersonalBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState('');
  const [activeAccountCount, setActiveAccountCount] = useState<number | null>(null);

  useEffect(() => {
    const loadHome = async () => {
      setBalanceLoading(true);
      setBalanceError('');
      try {
        const response = await axios.get('/finance');
        setPersonalBalance(personalBalanceFromRecords(response.data));
      } catch (err: unknown) {
        setPersonalBalance(0);
        setBalanceError(userFacingError(err, "Couldn't load your balance"));
      } finally {
        setBalanceLoading(false);
      }

      try {
        const response = await axios.get('/events');
        const events = Array.isArray(response.data) ? response.data : [];
        setActiveAccountCount(
          events.filter((event: { tripMoney?: { isDeleted?: boolean } | null }) => !event.tripMoney?.isDeleted).length
        );
      } catch {
        setActiveAccountCount(null);
      }
    };

    loadHome();
  }, []);

  return (
    <div>
      <div className="card">
        <h1 className="card-title">Home</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#4a5568', fontSize: '0.95rem' }}>
          Your personal overview.
        </p>
      </div>

      <div className="card home-balance-card">
        <p className="home-balance-label">Your balance</p>
        {balanceLoading ? (
          <p className="home-balance-amount" aria-live="polite">Loading…</p>
        ) : balanceError ? (
          <p className="home-balance-amount" aria-live="polite">{balanceError}</p>
        ) : (
          <p className="home-balance-amount">{formatPersonalBalanceGbp(personalBalance)}</p>
        )}
        <p className="home-balance-note">Prototype balance — no real money is held.</p>
      </div>

      {activeAccountCount !== null && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Active Shared Accounts: {activeAccountCount}
          </p>
          <p style={{ margin: '0.65rem 0 0' }}>
            <Link to="/events" style={{ color: '#2b6cb0' }}>Open Shared Accounts</Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
