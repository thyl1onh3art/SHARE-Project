import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userFacingError } from '../utils/userFacingError';
import { formatGbp, formatContributionDeadline } from '../utils/tripHome';
import { isInviteToken, withReturnTo } from '../utils/inviteLink';

interface InvitePreview {
  state?: string;
  message?: string | null;
  accountName?: string;
  organiserName?: string;
  targetAmount?: number | null;
  targetDate?: string | null;
  isOwnInvite?: boolean;
  acceptedByCurrentUser?: boolean;
  accountId?: string;
}

const InviteLanding: React.FC = () => {
  const { token = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPreview = async () => {
      if (!isInviteToken(token)) {
        setPreview({ state: 'invalid', message: 'This invitation link is invalid.' });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`/invites/link/${token}`);
        setPreview(response.data);
      } catch (err: unknown) {
        const data = (err as { response?: { data?: InvitePreview } })?.response?.data;
        const state = data?.state || 'invalid';
        setPreview({
          ...data,
          state,
          message: data?.message || (
            state === 'accepted' ? 'This invitation has already been accepted.'
            : state === 'expired' ? 'This invitation has expired.'
            : state === 'unavailable' ? 'This invitation is no longer available.'
            : 'This invitation link is invalid.'
          )
        });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadPreview();
    }
  }, [token, authLoading, user?.id]);

  const handleAccept = async () => {
    if (acting || !isInviteToken(token) || (preview?.state && preview.state !== 'pending')) return;
    setActing(true);
    setError('');
    try {
      const response = await axios.post(`/invites/link/${token}/accept`);
      if (response.data?.state && response.data.state !== 'pending') {
        setPreview((prev) => ({ ...prev, ...response.data }));
        return;
      }
      const accountId = response.data?.sharedAccount?._id;
      if (accountId) {
        navigate(`/shared-accounts/${accountId}?setupPlan=1`);
        return;
      }
      setPreview((prev) => ({ ...prev, state: 'accepted', message: 'This invitation has already been accepted.' }));
    } catch (err: unknown) {
      const data = (err as { response?: { data?: InvitePreview } })?.response?.data;
      if (data?.state) {
        setPreview((prev) => ({ ...prev, ...data }));
      } else {
        setError(userFacingError(err, 'Could not accept this invitation'));
      }
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (acting || !isInviteToken(token)) return;
    setActing(true);
    setError('');
    try {
      await axios.post(`/invites/link/${token}/decline`);
      setPreview((prev) => ({
        ...prev,
        state: 'unavailable',
        message: 'This invitation is no longer available.'
      }));
    } catch (err: unknown) {
      const data = (err as { response?: { data?: InvitePreview } })?.response?.data;
      if (data?.state) {
        setPreview((prev) => ({ ...prev, ...data }));
      } else {
        setError(userFacingError(err, 'Could not decline this invitation'));
      }
    } finally {
      setActing(false);
    }
  };

  const state = preview?.state || 'invalid';
  const accountName = preview?.accountName || 'Shared Account';
  const statusMessage = preview?.message
    || (state === 'expired' ? 'This invitation has expired.'
      : state === 'accepted' ? 'This invitation has already been accepted.'
      : state === 'unavailable' ? 'This invitation is no longer available.'
      : state === 'pending' ? ''
      : 'This invitation link is invalid.');

  return (
    <div className="card invite-landing">
      <h1 className="card-title">Shared Account invitation</h1>
      {loading || authLoading ? (
        <p className="home-section-copy" aria-live="polite">Loading invitation…</p>
      ) : (
        <>
          {state === 'pending' ? (
            <>
              <p className="home-section-copy">You&apos;ve been invited to join:</p>
              <h2 className="invite-landing-account">{accountName}</h2>
              {preview?.organiserName && (
                <p className="home-section-copy">Organised by {preview.organiserName}</p>
              )}
              {(preview?.targetAmount || preview?.targetDate) && (
                <p className="home-section-copy">
                  {preview.targetAmount ? `Target ${formatGbp(preview.targetAmount)}` : ''}
                  {preview.targetAmount && preview.targetDate ? ' · ' : ''}
                  {preview.targetDate ? formatContributionDeadline(preview.targetDate) : ''}
                </p>
              )}
              {preview?.isOwnInvite ? (
                <p className="home-section-copy">This is your Shared Account. Share the link with someone else to invite them.</p>
              ) : !user ? (
                <div className="invite-landing-actions">
                  <Link to={withReturnTo('/login', `/invite/${token}`)} className="btn btn-primary">
                    Sign in to continue
                  </Link>
                  <Link to={withReturnTo('/register', `/invite/${token}`)} className="btn btn-secondary">
                    Create an account
                  </Link>
                </div>
              ) : (
                <div className="invite-landing-actions">
                  <button type="button" className="btn btn-success" onClick={handleAccept} disabled={acting}>
                    {acting ? 'Working…' : 'Accept invitation'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleDecline} disabled={acting}>
                    Decline
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="home-section-copy">{statusMessage}</p>
              {(state === 'expired' || state === 'invalid' || state === 'unavailable') && (
                <p className="home-section-copy">Ask the organiser for a new invitation if you still need to join.</p>
              )}
              {state === 'accepted' && preview?.accountId && (
                <div className="invite-landing-actions">
                  <Link to={`/shared-accounts/${preview.accountId}`} className="btn btn-primary">
                    Open Shared Account
                  </Link>
                </div>
              )}
            </>
          )}
          {error && <p className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</p>}
          <p style={{ marginTop: '1.25rem' }}>
            <Link to="/" className="btn btn-secondary">Back to Home</Link>
          </p>
        </>
      )}
    </div>
  );
};

export default InviteLanding;
