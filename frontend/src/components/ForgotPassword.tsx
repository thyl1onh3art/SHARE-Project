import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { userFacingError } from '../utils/userFacingError';

const GENERIC_CONFIRMATION =
  'If an account exists for that email address, password reset instructions have been sent.';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/users/forgot-password', { email: trimmed });
      setDevelopmentResetUrl(
        typeof response.data?.developmentResetUrl === 'string'
          ? response.data.developmentResetUrl
          : ''
      );
      setSubmitted(true);
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not send reset instructions'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-header">
          <h2 className="card-title">Forgot password?</h2>
          <p style={{ margin: '0.35rem 0 0', color: '#4a5568', fontSize: '0.9rem' }}>
            Enter the email address for your SHARE account.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {submitted ? (
          <div data-testid="forgot-password-confirmation">
            <p style={{ color: '#2d3748', lineHeight: 1.5 }}>{GENERIC_CONFIRMATION}</p>
            {developmentResetUrl && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#4a5568' }}>
                Development only:{' '}
                <Link to={new URL(developmentResetUrl, window.location.origin).pathname}>
                  Open reset link
                </Link>
              </p>
            )}
            <p className="text-center" style={{ marginTop: '1.25rem', color: '#4a5568' }}>
              <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? <span className="spinner"></span> : 'Send reset link'}
            </button>
            <div className="text-center">
              <p style={{ color: '#4a5568' }}>
                <Link to="/login" style={{ color: '#667eea', textDecoration: 'none' }}>
                  Back to sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
