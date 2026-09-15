import React, { useState } from 'react';
import axios from 'axios';
import { sendInvitesForAccount } from '../utils/inviteHelpers';
import { userFacingError } from '../utils/userFacingError';
import { buildInviteShareMessage, inviteUrlFromToken } from '../utils/inviteLink';

interface InviteSharePanelProps {
  accountId: string;
  accountName: string;
}

const InviteSharePanel: React.FC<InviteSharePanelProps> = ({ accountId, accountName }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const createLink = async (): Promise<string | null> => {
    const response = await axios.post('/invites/link', { sharedAccountId: accountId });
    const token = String(response.data?.token || '');
    if (!token) return null;
    return inviteUrlFromToken(token);
  };

  const handleSendEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      const results = await sendInvitesForAccount(accountId, [
        { recipientEmail: email, recipientPhone: '' }
      ]);
      if (results.success > 0 && results.failed.length === 0) {
        setNotice(`Invitation sent to ${email.trim()}.`);
        setEmail('');
      } else {
        setError(results.failed.join('\n') || 'Could not send that invitation');
      }
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not send that invitation'));
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (linkBusy) return;
    setLinkBusy(true);
    setError('');
    setNotice('');
    try {
      const url = await createLink();
      if (!url) throw new Error('missing link');
      await navigator.clipboard.writeText(url);
      setNotice('Invite link copied.');
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not copy the invite link'));
    } finally {
      setLinkBusy(false);
    }
  };

  const handleShare = async () => {
    if (linkBusy) return;
    setLinkBusy(true);
    setError('');
    setNotice('');
    try {
      const url = await createLink();
      if (!url) throw new Error('missing link');
      const message = buildInviteShareMessage(accountName, url);
      if (canNativeShare) {
        try {
          await navigator.share({
            title: `Join ${accountName} on SHARE`,
            text: message
          });
          setNotice('Invite ready to share.');
          return;
        } catch {
          // Cancelled or unsupported — copy instead
        }
      }
      await navigator.clipboard.writeText(url);
      setNotice('Invite link copied.');
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not share the invite link'));
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <section className="card home-static-card" aria-labelledby="invite-members-heading">
      <h2 id="invite-members-heading" className="home-section-title">Invite members</h2>
      <form className="invite-email-row" onSubmit={handleSendEmail}>
        <label className="form-label" htmlFor="invite-email-field">Email invite</label>
        <div className="invite-email-controls">
          <input
            id="invite-email-field"
            type="email"
            className="form-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
      <div className="invite-share-block">
        <p className="form-label">Share invite</p>
        <div className="invite-share-row">
          <button type="button" className="btn btn-secondary" onClick={handleCopyLink} disabled={linkBusy}>
            Copy invite link
          </button>
          {canNativeShare && (
            <button type="button" className="btn btn-secondary" onClick={handleShare} disabled={linkBusy}>
              Share invite
            </button>
          )}
        </div>
      </div>
      {notice && <p className="invite-share-notice" role="status">{notice}</p>}
      {error && <p className="alert alert-error" style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap' }}>{error}</p>}
    </section>
  );
};

export default InviteSharePanel;
