import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './EmailVerification.css';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onBack: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ 
  email, 
  onVerificationComplete, 
  onBack 
}) => {
  const { sendVerificationCode, verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const handleSendCode = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await sendVerificationCode(email);
      setSuccess('Verification code sent to your email!');
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [email, sendVerificationCode]);

  useEffect(() => {
    // Send initial verification code
    handleSendCode();
  }, [handleSendCode]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyEmail(email, code);
      setSuccess('Email verified successfully!');
      setTimeout(() => {
        onVerificationComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setAttempts(prev => prev + 1);
      
      // Clear code on error
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  return (
    <div className="email-verification">
      <div className="verification-container">
        <div className="verification-header">
          <h2>Verify Your Email</h2>
          <p>We've sent a 6-digit verification code to:</p>
          <div className="email-display">{email}</div>
        </div>

        <form onSubmit={handleVerifyCode} className="verification-form">
          <div className="code-input-group">
            <label htmlFor="verification-code">Enter verification code:</label>
            <input
              id="verification-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              className={`code-input ${error ? 'error' : ''}`}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
              {attempts > 0 && (
                <div className="attempts-info">
                  Attempts: {attempts}/3
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <button 
            type="submit" 
            className="verify-button"
            disabled={loading || code.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="verification-footer">
          <p>Didn't receive the code?</p>
          <button 
            onClick={handleSendCode}
            disabled={loading || resendCooldown > 0}
            className="resend-button"
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : 'Resend Code'
            }
          </button>
          
          <button 
            onClick={onBack}
            className="back-button"
            disabled={loading}
          >
            ← Back to Registration
          </button>
        </div>

        <div className="verification-info">
          <h4>Important Notes:</h4>
          <ul>
            <li>Check your spam folder if you don't see the email</li>
            <li>The code expires in 15 minutes</li>
            <li>You have 3 attempts to enter the correct code</li>
            <li>If you don't receive the email, try resending</li>
          </ul>
        </div>
      </div>

    </div>
  );
};

export default EmailVerification;
