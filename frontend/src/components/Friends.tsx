import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export interface Friend {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
}

const Friends: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/friends');
      setFriends(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/friends', { email: email.trim() });
      setSuccess(response.data.message || 'Friend added');
      setEmail('');
      await fetchFriends();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add friend');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/friends/${friendId}`);
      setSuccess('Friend removed from your list');
      setFriends((current) => current.filter((friend) => friend.id !== friendId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading friends...</p>
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
            <h1 className="card-title" style={{ marginBottom: '0.35rem' }}>Friends</h1>
            <p style={{ margin: 0, color: '#4a5568', fontSize: '0.95rem' }}>
              Your SHARE friends — people you often share costs with. Saving someone here does not give them access to your Shared Accounts; invite them separately when you plan together.
            </p>
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem' }}>
              <Link to="/events" style={{ color: '#2b6cb0' }}>Shared Accounts</Link>
              {' · '}
              <Link to="/invitations" style={{ color: '#2b6cb0' }}>Notifications</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Add friend</h2>
        <p style={{ color: '#718096', fontSize: '0.9rem' }}>
          Add by email — they must already have a SHARE account. Friendship is a contact list only; it does not open Shared Account membership.
        </p>

        <form onSubmit={handleAddFriend}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="spinner"></span> : 'Add friend'}
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginTop: '1rem' }}>
          {success}
        </div>
      )}

      <div className="card" style={{ marginTop: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}
        >
          <h2 style={{ margin: 0 }}>Your SHARE friends ({friends.length})</h2>
          <Link to="/invitations" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Open Notifications
          </Link>
        </div>

        {friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#718096' }}>
            <p>No friends saved yet.</p>
            <p style={{ fontSize: '0.9rem' }}>
              Add someone by email above, then invite them to a trip from{' '}
              <Link to="/invitations">Notifications</Link> when you are ready to share an account.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="list-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 12rem' }}>
                  <strong style={{ wordBreak: 'break-word' }}>{friend.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#718096', wordBreak: 'break-word' }}>{friend.email}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#e53e3e', flexShrink: 0 }}
                  onClick={() => handleRemoveFriend(friend.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
