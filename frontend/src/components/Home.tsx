import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatPersonalBalanceGbp, personalBalanceFromRecords } from '../utils/personalBalance';
import { userFacingError } from '../utils/userFacingError';
import {
  HomeAccountInput,
  HomeAttentionItem,
  HomeEventInput,
  HomeInviteInput,
  HomePaymentInput,
  buildHomeAccountSummaries,
  buildHomeAttentionItems,
  homeProgressText,
  previewHomeAccounts
} from '../utils/homeDashboard';
import SharedAccountRoleBadge from './SharedAccountRoleBadge';

const Home: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || '';
  const userEmail = user?.email || '';
  const firstName = user?.firstName?.trim();

  const [personalBalance, setPersonalBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState('');

  const [accounts, setAccounts] = useState<HomeAccountInput[]>([]);
  const [events, setEvents] = useState<HomeEventInput[]>([]);
  const [payments, setPayments] = useState<HomePaymentInput[]>([]);
  const [invites, setInvites] = useState<HomeInviteInput[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');

  useEffect(() => {
    const loadHome = async () => {
      setBalanceLoading(true);
      setBalanceError('');
      setAccountsLoading(true);
      setAccountsError('');

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
        const [accountsResponse, eventsResponse, paymentsResponse, invitesResponse] = await Promise.all([
          axios.get('/shared-accounts'),
          axios.get('/events').catch(() => ({ data: [] })),
          axios.get('/payment-requests').catch(() => ({ data: [] })),
          axios.get('/invites/list').catch(() => ({ data: [] }))
        ]);
        setAccounts(Array.isArray(accountsResponse.data) ? accountsResponse.data : []);
        setEvents(Array.isArray(eventsResponse.data) ? eventsResponse.data : []);
        setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);
        setInvites(Array.isArray(invitesResponse.data) ? invitesResponse.data : []);
      } catch (err: unknown) {
        setAccounts([]);
        setEvents([]);
        setPayments([]);
        setInvites([]);
        setAccountsError(userFacingError(err, "Couldn't load your Shared Accounts"));
      } finally {
        setAccountsLoading(false);
      }
    };

    loadHome();
  }, []);

  const accountSummaries = useMemo(
    () => buildHomeAccountSummaries({ accounts, events, payments, userId }),
    [accounts, events, payments, userId]
  );
  const previewAccounts = useMemo(
    () => previewHomeAccounts(accountSummaries),
    [accountSummaries]
  );
  const attentionItems = useMemo(
    () => buildHomeAttentionItems({ accounts: accountSummaries, invites, userEmail }),
    [accountSummaries, invites, userEmail]
  );

  const hasAccounts = accountSummaries.length > 0;
  const welcomeName = firstName || user?.name?.split(' ')[0] || '';

  return (
    <div className="home-dashboard">
      <div className="card home-static-card">
        <h1 className="card-title">Home</h1>
        <p className="home-welcome">
          {welcomeName ? `Welcome to SHARE, ${welcomeName}.` : 'Welcome to SHARE.'}
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

      {attentionItems.length > 0 && (
        <section className="card home-static-card" aria-labelledby="home-attention-heading">
          <h2 id="home-attention-heading" className="home-section-title">Needs your attention</h2>
          <ul className="home-attention-list">
            {attentionItems.map((item: HomeAttentionItem) => (
              <li key={item.id} className="home-attention-item">
                <div>
                  <p className="home-attention-title">{item.title}</p>
                  <p className="home-attention-account">{item.accountName}</p>
                </div>
                <Link
                  to={item.to}
                  className="btn btn-primary home-attention-action"
                  aria-label={`${item.actionLabel} ${item.accountName}`}
                >
                  {item.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card home-static-card" aria-labelledby="home-accounts-heading">
        <h2 id="home-accounts-heading" className="home-section-title">Your Shared Accounts</h2>
        {accountsLoading ? (
          <p className="home-section-copy" aria-live="polite">Loading Shared Accounts…</p>
        ) : accountsError ? (
          <p className="home-section-copy" aria-live="polite">{accountsError}</p>
        ) : !hasAccounts ? (
          <div className="home-empty">
            <p className="home-section-copy">You don&apos;t have any Shared Accounts yet.</p>
            <p className="home-section-copy">Create one to start contributing together.</p>
            <Link to="/events?create=1" className="btn btn-primary">
              Create Shared Account
            </Link>
          </div>
        ) : (
          <ul className="home-account-list">
            {previewAccounts.map((account) => (
              <li key={account.id}>
                <Link
                  to={account.openTo}
                  className="home-account-card"
                  aria-label={`Open ${account.name}`}
                >
                  <div className="home-account-card-header">
                    <div className="shared-account-title-row home-account-heading">
                      <h3 className="home-account-name">{account.name}</h3>
                      <SharedAccountRoleBadge role={account.viewerRole} />
                    </div>
                    <span className="home-account-open">View</span>
                  </div>
                  <p className="home-account-progress-text">
                    {homeProgressText(account.recordedTotal, account.targetAmount)}
                    {account.targetAmount ? ` · ${account.progressPercent}% funded` : ''}
                  </p>
                  {account.targetAmount ? (
                    <div
                      className="trip-money-progress-track home-account-progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={account.progressPercent}
                      aria-label={`${account.name} ${account.progressPercent} percent funded`}
                    >
                      <div
                        className="trip-money-progress-fill"
                        style={{ width: `${account.progressPercent}%` }}
                      />
                    </div>
                  ) : null}
                  <p className="home-account-status">
                    {account.statusLabel}
                    {account.goalLabel ? ` · ${account.goalLabel}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasAccounts && (
        <div className="home-actions">
          <Link to="/events?create=1" className="btn btn-primary">
            Create Shared Account
          </Link>
          <Link to="/events" className="btn btn-secondary">
            View all Shared Accounts
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;
