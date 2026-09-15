import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { userFacingError } from '../utils/userFacingError';
import { validateRegistrationPassword } from '../utils/passwordRules';

const INVALID_TOKEN_MESSAGE = 'This password reset link is invalid or has expired.';

export const ResetPasswordComplete: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh'
  }}>
    <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
      <div data-testid="reset-password-success">
        <div className="card-header">
          <h2 className="card-title">Password updated</h2>
        </div>
        <p style={{ color: '#2d3748', lineHeight: 1.5 }}>
          Your password has been changed successfully.
        </p>
        <p className="text-center" style={{ marginTop: '1.25rem' }}>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  </div>
);

const ResetPassword: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const checkToken = async () => {
      try {
        await axios.get(`/users/reset-password/${token}`);
        if (!cancelled) {
          setTokenInvalid(false);
        }
      } catch {
        if (!cancelled) {
          setTokenInvalid(true);
        }
      } finally {
        if (!cancelled) {
          setCheckingToken(false);
        }
      }
    };
    checkToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const validationError = validateRegistrationPassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/users/reset-password/${token}`, { password, confirmPassword });
      navigate('/reset-password/complete', { replace: true });
    } catch (err: unknown) {
      const message = userFacingError(err, INVALID_TOKEN_MESSAGE);
      if (/invalid or has expired/i.test(message)) {
        setTokenInvalid(true);
      } else {
        setError(message);
      }
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
        {checkingToken ? (
          <p style={{ color: '#4a5568' }}>Checking reset link…</p>
        ) : tokenInvalid ? (
          <div data-testid="reset-password-invalid">
            <div className="card-header">
              <h2 className="card-title">Reset link unavailable</h2>
            </div>
            <p style={{ color: '#2d3748', lineHeight: 1.5 }}>{INVALID_TOKEN_MESSAGE}</p>
            <p className="text-center" style={{ marginTop: '1.25rem' }}>
              <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'inline-block' }}>
                Request a new reset link
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="card-header">
              <h2 className="card-title">Choose a new password</h2>
            </div>
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-password">New password</label>
                <div className="password-input-container">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input password-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Enter a new password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  marginTop: '0.5rem',
                  padding: '8px 12px',
                  backgroundColor: '#f7fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <strong>Password Requirements:</strong>
                  <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                    <li>At least 8 characters long</li>
                    <li>Contains at least one uppercase letter (A-Z)</li>
                    <li>Contains at least one lowercase letter (a-z)</li>
                    <li>Contains at least one number (0-9)</li>
                  </ul>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm-password">Confirm new password</label>
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  placeholder="Confirm your new password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                {loading ? <span className="spinner"></span> : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
