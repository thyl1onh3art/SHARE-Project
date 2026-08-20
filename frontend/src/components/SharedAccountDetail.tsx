import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface FinanceRecord {
  _id: string;
  type: 'input' | 'output';
  amount: number;
  date: string;
  description?: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  financeRecords: FinanceRecord[];
  targetAmount?: number;
  targetDate?: string;
  perPersonAmount?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
}

const SharedAccountDetail: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [account, setAccount] = useState<SharedAccount | null>(null);
  const [transactions, setTransactions] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [availableWithdrawal, setAvailableWithdrawal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [pendingSettlementRequests, setPendingSettlementRequests] = useState<any[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [permanentDeleteSubmitting, setPermanentDeleteSubmitting] = useState(false);
  const [showOrganiserTransferModal, setShowOrganiserTransferModal] = useState(false);
  const [organiserTransferId, setOrganiserTransferId] = useState('');
  const [organiserTransferSubmitting, setOrganiserTransferSubmitting] = useState(false);

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch account details
      const accountResponse = await axios.get(`/shared-accounts/${accountId}`);
      const accountData = accountResponse.data;

      // Fetch all finance records for this account
      const recordsResponse = await axios.get(`/finance?sharedAccount=${accountId}`);
      const records = recordsResponse.data;

      // Populate user details for each record
      const populatedRecords = await Promise.all(
        records.map(async (record: any) => {
          try {
            const userResponse = await axios.get(`/users/${record.user}`);
            return {
              ...record,
              user: userResponse.data
            };
          } catch {
            return {
              ...record,
              user: { _id: record.user, firstName: 'Unknown', lastName: 'User', email: '' }
            };
          }
        })
      );

      setAccount(accountData);
      setTransactions(populatedRecords.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

      try {
        const settlementResponse = await axios.get('/payment-requests');
        const forThisAccount = (settlementResponse.data || []).filter((req: any) => {
          const reqAccountId =
            typeof req.sharedAccount === 'object'
              ? req.sharedAccount?._id
              : req.sharedAccount;
          return String(reqAccountId) === String(accountId);
        });
        setPendingSettlementRequests(forThisAccount);
      } catch {
        setPendingSettlementRequests([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserId = () => {
    return (user as any)?._id || (user as any)?.id || '';
  };

  const calculateBalance = () => {
    if (!transactions.length) return 0;
    return transactions.reduce((sum, record) => {
      return sum + (record.type === 'input' ? record.amount : -record.amount);
    }, 0);
  };

  const calculateUserContribution = (userId: string) => {
    return transactions
      .filter(record => String(record.user._id) === String(userId) && record.type === 'input')
      .reduce((sum, record) => sum + record.amount, 0);
  };

  const calculateUserNetRecorded = (userId: string) => {
    return transactions
      .filter(record => String(record.user._id) === String(userId))
      .reduce((sum, record) => sum + (record.type === 'input' ? record.amount : -record.amount), 0);
  };

  const calculateAvailableWithdrawal = (userId: string) => {
    const contributions = transactions
      .filter(record => record.user._id === userId && record.type === 'input')
      .reduce((sum, record) => sum + record.amount, 0);
    
    const withdrawals = transactions
      .filter(record => record.user._id === userId && record.type === 'output')
      .reduce((sum, record) => sum + record.amount, 0);
    
    return Math.max(0, contributions - withdrawals);
  };

  useEffect(() => {
    if (user && transactions.length > 0) {
      const userId = getCurrentUserId();
      const available = calculateAvailableWithdrawal(userId);
      setAvailableWithdrawal(available);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactions]);

  const handleWithdrawClick = () => {
    if (user) {
      const userId = getCurrentUserId();
      const available = calculateAvailableWithdrawal(userId);
      setAvailableWithdrawal(available);
      setWithdrawAmount(available.toFixed(2));
      setShowWithdrawModal(true);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !withdrawAmount) return;

    setWithdrawSubmitting(true);
    setError('');

    try {
      await axios.post(`/shared-accounts/${accountId}/withdraw`, {
        amount: parseFloat(withdrawAmount),
        description: withdrawDescription || undefined
      });

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawDescription('');
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reverse recorded contribution');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const fetchPersonalBalance = async () => {
    try {
      setLoadingPersonalBalance(true);
      const personalRecordsResponse = await axios.get('/finance');
      const personalRecords = personalRecordsResponse.data.filter((record: any) => !record.sharedAccount);
      const personalIncome = personalRecords
        .filter((record: any) => record.type === 'input')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      const personalExpenses = personalRecords
        .filter((record: any) => record.type === 'output')
        .reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
      setPersonalBalance(personalIncome - personalExpenses);
    } catch {
      setPersonalBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  const handleEditClick = () => {
    if (!account) return;
    setEditForm({
      name: account.name || '',
      description: account.description || '',
      targetAmount: account.targetAmount ? account.targetAmount.toString() : '',
      targetDate: account.targetDate ? new Date(account.targetDate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    if (account?.isDeleted) {
      setShowEditModal(false);
      return;
    }
    setEditSubmitting(true);
    setError('');

    try {
      const updateData: any = {};
      if (editForm.name.trim()) updateData.name = editForm.name.trim();
      if (editForm.description.trim()) updateData.description = editForm.description.trim();
      if (editForm.targetAmount) updateData.targetAmount = parseFloat(editForm.targetAmount);
      if (editForm.targetDate) updateData.targetDate = new Date(editForm.targetDate).toISOString();

      await axios.put(`/shared-accounts/${accountId}`, updateData);
      setShowEditModal(false);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update account details');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTransferClick = async () => {
    setTransferForm({ amount: '', description: '' });
    setError('');
    setShowTransferModal(true);
    await fetchPersonalBalance();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !accountId) return;

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (personalBalance !== null && amount > personalBalance) {
      setError('Amount exceeds your personal tracked total');
      return;
    }

    if (account.targetAmount && account.targetAmount > 0) {
      const currentBalance = calculateBalance();
      const newBalance = currentBalance + amount;
      if (newBalance > account.targetAmount) {
        const remaining = account.targetAmount - currentBalance;
        setError(
          `Contribution would exceed the target of £${account.targetAmount.toFixed(2)}. ` +
          `Maximum you can record now: £${remaining.toFixed(2)}`
        );
        return;
      }
    }

    setTransferSubmitting(true);
    setError('');
    const date = new Date().toISOString();
    const transferDescription = transferForm.description || `Contribution to ${account.name}`;

    try {
      await axios.post('/finance', {
        type: 'output',
        amount,
        date,
        description: transferDescription
      });
      await axios.post('/finance', {
        type: 'input',
        amount,
        date,
        description: transferDescription,
        sharedAccount: accountId
      });
      setShowTransferModal(false);
      setTransferForm({ amount: '', description: '' });
      await fetchAccountDetails();
      await fetchPersonalBalance();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record contribution');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handlePayClick = async () => {
    setError('');
    setShowPayModal(true);
    await fetchPersonalBalance();
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !accountId) return;

    const balance = calculateBalance();
    if (balance <= 0) {
      setError('Nothing recorded to settle. The tracked total for this trip pot is £0.00 or less.');
      return;
    }

    if (personalBalance !== null && balance > personalBalance) {
      setError('Your personal tracked total is lower than the amount to settle.');
      return;
    }

    setPaySubmitting(true);
    setError('');

    try {
      await axios.post('/payment-requests', {
        sharedAccountId: accountId,
        amount: balance,
        description: `Settlement record for ${account.name}`
      });
      setShowPayModal(false);
      await fetchAccountDetails();
      alert('Settlement request created. All travellers will be notified and must approve before the ledger settlement is recorded. SHARE does not send bank payments.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create settlement request');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleApproveSettlement = async (requestId: string) => {
    setError('');
    try {
      await axios.post(`/payment-requests/${requestId}/approve`);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve settlement record');
    }
  };

  const handleRejectSettlement = async (requestId: string) => {
    setError('');
    try {
      await axios.post(`/payment-requests/${requestId}/reject`);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject settlement record');
    }
  };

  const handleCancelSettlement = async (requestId: string) => {
    setError('');
    try {
      await axios.post(`/payment-requests/${requestId}/cancel`);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel settlement request');
    }
  };

  const handleRemoveAccount = async () => {
    if (!account || !accountId) return;
    const currentUserId = getCurrentUserId();
    const ownerId = typeof account.owner === 'object' ? account.owner._id : account.owner;
    const isOwner = ownerId === currentUserId;

    if (isOwner && !newOwnerId) {
      setError('Please select a new owner before removing this account.');
      return;
    }

    setRemoveSubmitting(true);
    setError('');

    try {
      if (isOwner) {
        await axios.post(`/shared-accounts/${accountId}/transfer-ownership`, {
          newOwnerId,
          removeCurrentOwner: true
        });
      } else {
        await axios.post('/invites/remove-member', {
          sharedAccountId: accountId,
          memberId: currentUserId
        });
      }
      navigate('/shared-accounts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove account');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const handleArchiveTripMoney = async () => {
    if (!accountId) return;
    setArchiveSubmitting(true);
    setError('');
    try {
      await axios.delete(`/shared-accounts/${accountId}`);
      setShowArchiveModal(false);
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive Trip Money');
    } finally {
      setArchiveSubmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!accountId) return;
    setPermanentDeleteSubmitting(true);
    setError('');
    try {
      await axios.delete(`/shared-accounts/${accountId}/permanent`);
      setShowPermanentDeleteModal(false);
      navigate('/shared-accounts');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to permanently delete Trip Money');
    } finally {
      setPermanentDeleteSubmitting(false);
    }
  };

  const handleTransferOrganiserRole = async () => {
    if (!accountId || !organiserTransferId) {
      setError('Select a traveller to make organiser.');
      return;
    }
    setOrganiserTransferSubmitting(true);
    setError('');
    try {
      await axios.post(`/shared-accounts/${accountId}/transfer-ownership`, {
        newOwnerId: organiserTransferId,
        removeCurrentOwner: false
      });
      setShowOrganiserTransferModal(false);
      setOrganiserTransferId('');
      await fetchAccountDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to transfer organiser role');
    } finally {
      setOrganiserTransferSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading account details...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card">
        <p style={{ color: '#e53e3e' }}>{error || 'Account not found'}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/shared-accounts')}>
          Back to Trip Money
        </button>
      </div>
    );
  }

  const userId = user ? getCurrentUserId() : '';
  const userContribution = user ? calculateUserContribution(userId) : 0;
  const allParticipants = [account.owner, ...account.members].filter(Boolean);
  const ownerId = typeof account.owner === 'object' ? account.owner._id : account.owner;
  const isOwner = String(ownerId) === String(userId);
  const isArchived = !!account.isDeleted;
  const recordedTotal = calculateBalance();
  const hasTarget = !!(account.targetAmount && account.targetAmount > 0);
  const remainingToContribute = hasTarget
    ? Math.max(0, (account.targetAmount as number) - recordedTotal)
    : null;
  const percentComplete = hasTarget
    ? Math.min(100, Math.max(0, (recordedTotal / (account.targetAmount as number)) * 100))
    : 0;
  const suggestedEqualShare =
    hasTarget
      ? (account.perPersonAmount && account.perPersonAmount > 0
          ? account.perPersonAmount
          : (account.targetAmount as number) / Math.max(1, allParticipants.length))
      : null;
  const contributionCount = transactions.filter((t) => t.type === 'input').length;
  const activityCount = transactions.length;
  const amountAboveTarget = hasTarget
    ? Math.max(0, recordedTotal - (account.targetAmount as number))
    : 0;
  const last24HoursCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentTransactions = transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date).getTime();
    return Number.isFinite(transactionTime) && transactionTime >= last24HoursCutoff;
  });

  type CloseOutStatus = 'no_target' | 'still_collecting' | 'ready_to_review' | 'review_difference';
  let closeOutStatus: CloseOutStatus = 'no_target';
  let closeOutLabel = 'No target set';
  let closeOutDetail = 'Close-out comparison needs a contribution target. Set one to compare recorded totals.';
  if (hasTarget && remainingToContribute !== null && remainingToContribute > 0.001) {
    closeOutStatus = 'still_collecting';
    closeOutLabel = 'Still collecting';
    closeOutDetail = 'The recorded total is still below the contribution target. Keep recording contributions as the group commits.';
  } else if (hasTarget && amountAboveTarget > 0.001) {
    closeOutStatus = 'review_difference';
    closeOutLabel = 'Review difference';
    closeOutDetail = 'Recorded total is above the contribution target on the ledger. Review traveller positions before you document any settlement decision.';
  } else if (hasTarget) {
    closeOutStatus = 'ready_to_review';
    closeOutLabel = 'Ready to review';
    closeOutDetail = 'The contribution target is reached on the ledger. Review each traveller’s recorded position. Reaching the target does not mean real-world settlements are finished.';
  }

  let organiserNextStep = 'Record a contribution when money has been committed for this trip.';
  if (isArchived) {
    organiserNextStep = 'This Trip Money pot is archived. Review recorded history only.';
  } else if (!hasTarget && isOwner) {
    organiserNextStep = 'Set a contribution target so travellers can see what the group is aiming for.';
  } else if (allParticipants.length <= 1) {
    organiserNextStep = 'Invite travellers so everyone can record their share of the trip costs.';
  } else if (hasTarget && remainingToContribute !== null && remainingToContribute > 0) {
    organiserNextStep = `£${remainingToContribute.toFixed(2)} still to contribute toward the group target.`;
  } else if (hasTarget && remainingToContribute === 0) {
    organiserNextStep = 'Contribution target reached on the ledger. Request a settlement record when the group is ready to close out.';
  }

  return (
    <div className="trip-money-detail">
      <div className="trip-money-detail-header">
        <button className="btn btn-secondary" onClick={() => navigate('/shared-accounts')}>
          ← Back to Trip Money
        </button>
        {!isArchived && (
          <button
            onClick={() => setShowRemoveModal(true)}
            aria-label="Leave shared trip costs"
            title="Leave shared trip costs"
            className="trip-money-remove-btn"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {isArchived && (
        <div
          className="card"
          style={{
            marginBottom: '1rem',
            background: '#edf2f7',
            border: '1px solid #cbd5e0'
          }}
        >
          <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Archived Trip Money</h2>
          <p style={{ margin: 0, color: '#4a5568' }}>
            This record is kept for your trip history. New contribution activity cannot be recorded.
          </p>
        </div>
      )}

      {/* Contribution progress hero */}
      <div className="card trip-money-hero">
        <p className="trip-money-kicker">Shared trip costs</p>
        <h1 className="trip-money-title">{account.name}</h1>
        {account.description ? (
          <p className="trip-money-purpose">
            <strong>What the group is coordinating:</strong> {account.description}
          </p>
        ) : (
          <p className="trip-money-purpose trip-money-empty-hint">
            No description yet. Add what these shared costs are for (for example accommodation deposit or tickets).
          </p>
        )}

        <div className="trip-money-transparency">
          SHARE records and coordinates group contributions. It does not hold this tracked amount in a SHARE bank account.
        </div>

        {hasTarget ? (
          <div className="trip-money-progress-block">
            <div className="trip-money-progress-meta">
              <span>
                <strong>£{recordedTotal.toFixed(2)}</strong> recorded of{' '}
                <strong>£{(account.targetAmount as number).toFixed(2)}</strong>
              </span>
              <span>{Math.round(percentComplete)}% complete</span>
            </div>
            <div
              className="trip-money-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percentComplete)}
              aria-label="Contribution progress"
            >
              <div
                className="trip-money-progress-fill"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <div className="trip-money-stat-grid">
              <div>
                <p className="trip-money-stat-label">Contribution target</p>
                <p className="trip-money-stat-value">£{(account.targetAmount as number).toFixed(2)}</p>
              </div>
              <div>
                <p className="trip-money-stat-label">Recorded total</p>
                <p className="trip-money-stat-value">£{recordedTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="trip-money-stat-label">Remaining to contribute</p>
                <p className="trip-money-stat-value">
                  £{(remainingToContribute as number).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="trip-money-stat-label">Travellers</p>
                <p className="trip-money-stat-value">{allParticipants.length}</p>
              </div>
            </div>
            {account.targetDate && (
              <p className="trip-money-target-date">
                Target date: {new Date(account.targetDate).toLocaleDateString()}
              </p>
            )}
            {suggestedEqualShare !== null && (
              <p className="trip-money-equal-share">
                Suggested equal share (illustrative, not mandatory): £{suggestedEqualShare.toFixed(2)} each
              </p>
            )}
          </div>
        ) : (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">No contribution target set</p>
            <p>
              Recorded so far: <strong>£{recordedTotal.toFixed(2)}</strong>. Set a target so the group can see what remains.
            </p>
            {isOwner && !isArchived && (
              <button className="btn btn-primary" onClick={handleEditClick}>
                Set contribution target
              </button>
            )}
          </div>
        )}

        {contributionCount === 0 && (
          <div className="trip-money-empty-panel" style={{ marginTop: '1rem' }}>
            <p className="trip-money-empty-title">No contributions recorded yet</p>
            <p>When someone commits money toward this trip, record it here so the group position stays clear.</p>
          </div>
        )}

        <div className="trip-money-next-step">
          <strong>{isOwner ? 'Organiser next step:' : 'Next step:'}</strong> {organiserNextStep}
        </div>

        {user && (
          <p className="trip-money-your-contribution">
            Your recorded contribution: <strong>£{userContribution.toFixed(2)}</strong>
            {availableWithdrawal > 0 && (
              <> · Available to reverse (recorded): <strong>£{availableWithdrawal.toFixed(2)}</strong></>
            )}
          </p>
        )}

        <div className="trip-money-actions">
          {!isArchived && (
            <>
              <button className="btn btn-primary" onClick={handleTransferClick}>
                Record contribution
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/invitations?account=${account._id}`)}
              >
                Invite traveller
              </button>
              {isOwner && (
                <button className="btn btn-secondary" onClick={handleEditClick}>
                  {hasTarget ? 'Edit details' : 'Set contribution target'}
                </button>
              )}
              {!isOwner && (
                <button className="btn btn-secondary" onClick={handleEditClick}>
                  View details
                </button>
              )}
              <button className="btn btn-secondary" onClick={handlePayClick}>
                Request settlement record
              </button>
            </>
          )}
          {isArchived && (
            <button className="btn btn-secondary" onClick={handleEditClick}>
              View details
            </button>
          )}
        </div>

        {user && availableWithdrawal > 0 && !isArchived && (
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleWithdrawClick} style={{ width: '100%' }}>
              Reverse recorded contribution (£{availableWithdrawal.toFixed(2)} available)
            </button>
          </div>
        )}
      </div>

      {/* Traveller contribution status */}
      <div className="card" style={{ marginBottom: '1.5rem' }} id="traveller-contributions">
        <h2 className="card-title">Traveller contributions</h2>
        {allParticipants.length <= 1 ? (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">No other travellers yet</p>
            <p>Invite friends so everyone can record their share of the trip costs.</p>
            {!isArchived && (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/invitations?account=${account._id}`)}
              >
                Invite traveller
              </button>
            )}
          </div>
        ) : (
          <div className="trip-money-member-list">
            {allParticipants.map((participant) => {
              const participantId = participant._id;
              const netRecorded = calculateUserNetRecorded(participantId);
              const remainingForPerson =
                suggestedEqualShare !== null
                  ? Math.max(0, suggestedEqualShare - Math.max(0, netRecorded))
                  : null;
              const isComplete =
                suggestedEqualShare !== null && netRecorded >= suggestedEqualShare - 0.001;
              const isSelf = String(participantId) === String(userId);
              const isOrganiser = String(participantId) === String(ownerId);

              return (
                <div key={participantId} className="trip-money-member-row">
                  <div className="trip-money-member-main">
                    <div>
                      <strong>
                        {participant.firstName} {participant.lastName}
                        {isSelf ? ' (you)' : ''}
                      </strong>
                      <div className="trip-money-member-meta">
                        {isOrganiser ? 'Organiser' : 'Traveller'}
                        {participant.email ? ` · ${participant.email}` : ''}
                      </div>
                    </div>
                    <span
                      className={`trip-money-status-pill ${
                        suggestedEqualShare === null
                          ? 'trip-money-status-neutral'
                          : isComplete
                            ? 'trip-money-status-complete'
                            : 'trip-money-status-pending'
                      }`}
                    >
                      {suggestedEqualShare === null
                        ? 'Tracking'
                        : isComplete
                          ? 'Complete'
                          : 'Still to contribute'}
                    </span>
                  </div>
                  <div className="trip-money-member-figures">
                    <div>
                      <span className="trip-money-stat-label">Recorded</span>
                      <span className="trip-money-member-amount">£{Math.max(0, netRecorded).toFixed(2)}</span>
                    </div>
                    {suggestedEqualShare !== null && (
                      <div>
                        <span className="trip-money-stat-label">Suggested share</span>
                        <span className="trip-money-member-amount">£{suggestedEqualShare.toFixed(2)}</span>
                      </div>
                    )}
                    {remainingForPerson !== null && (
                      <div>
                        <span className="trip-money-stat-label">Remaining (vs share)</span>
                        <span className="trip-money-member-amount">£{remainingForPerson.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {suggestedEqualShare !== null && (
              <p className="trip-money-equal-share" style={{ marginTop: '0.75rem' }}>
                Equal-share figures are guidance only. Unequal contributions are allowed.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="card" id="group-activity">
        <h2 className="card-title">Group spending record (last 24 hours)</h2>
        <p style={{ color: '#4a5568', fontSize: '0.9rem', marginTop: '-0.25rem' }}>
          Showing {recentTransactions.length} of {transactions.length} total recorded item{transactions.length !== 1 ? 's' : ''}.
        </p>
        {transactions.length === 0 ? (
          <div className="trip-money-empty-panel">
            <p className="trip-money-empty-title">Nothing recorded yet</p>
            <p>Use Record contribution when someone has committed money toward these shared trip costs.</p>
            <button className="btn btn-primary" onClick={handleTransferClick}>
              Record contribution
            </button>
          </div>
        ) : recentTransactions.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No activity in the last 24 hours.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#4a5568', fontWeight: '600' }}>Traveller</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: '#4a5568', fontWeight: '600' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {new Date(transaction.date).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        background: transaction.type === 'input' ? '#c6f6d5' : '#fed7d7',
                        color: transaction.type === 'input' ? '#22543d' : '#742a2a'
                      }}>
                        {transaction.type === 'input' ? 'Contribution' : 'Cost / reverse'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {transaction.description || 'No description'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#4a5568' }}>
                      {transaction.user.firstName} {transaction.user.lastName}
                    </td>
                    <td style={{
                      padding: '0.75rem',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: transaction.type === 'input' ? '#38a169' : '#e53e3e'
                    }}>
                      {transaction.type === 'input' ? '+' : '-'}£{transaction.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trip Close-out — final review stage (non-custodial) */}
      <div className="card trip-closeout">
        <p className="trip-money-kicker">End of trip review</p>
        <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Trip Close-out</h2>
        <p style={{ color: '#4a5568', marginTop: 0 }}>
          Review what SHARE has recorded, compare traveller positions, and document settlement decisions.
          SHARE helps the group finish square on paper — it does not return money, distribute residue, or close a bank account.
        </p>
        <div className="trip-money-transparency">
          Settlement records help the group record what has been agreed. SHARE does not move or hold the underlying money.
        </div>

        <div className={`trip-closeout-status trip-closeout-status--${closeOutStatus}`}>
          <strong>{closeOutLabel}</strong>
          <p style={{ margin: '0.35rem 0 0' }}>{closeOutDetail}</p>
        </div>

        <div className="trip-money-stat-grid" style={{ marginTop: '1rem' }}>
          <div>
            <p className="trip-money-stat-label">Contribution target</p>
            <p className="trip-money-stat-value">
              {hasTarget ? `£${(account.targetAmount as number).toFixed(2)}` : 'Not set'}
            </p>
          </div>
          <div>
            <p className="trip-money-stat-label">Recorded total</p>
            <p className="trip-money-stat-value">£{recordedTotal.toFixed(2)}</p>
          </div>
          {hasTarget && remainingToContribute !== null && remainingToContribute > 0 && (
            <div>
              <p className="trip-money-stat-label">Remaining to contribute</p>
              <p className="trip-money-stat-value">£{remainingToContribute.toFixed(2)}</p>
            </div>
          )}
          {hasTarget && amountAboveTarget > 0 && (
            <div>
              <p className="trip-money-stat-label">Recorded above target</p>
              <p className="trip-money-stat-value">£{amountAboveTarget.toFixed(2)}</p>
            </div>
          )}
          {hasTarget && (
            <div>
              <p className="trip-money-stat-label">Of target recorded</p>
              <p className="trip-money-stat-value">{Math.round(percentComplete)}%</p>
            </div>
          )}
          <div>
            <p className="trip-money-stat-label">Travellers</p>
            <p className="trip-money-stat-value">{allParticipants.length}</p>
          </div>
          <div>
            <p className="trip-money-stat-label">Contribution records</p>
            <p className="trip-money-stat-value">{contributionCount}</p>
          </div>
          <div>
            <p className="trip-money-stat-label">Ledger activity items</p>
            <p className="trip-money-stat-value">{activityCount}</p>
          </div>
        </div>

        {account.targetDate && (
          <p className="trip-money-target-date">
            Target date: {new Date(account.targetDate).toLocaleDateString()}
          </p>
        )}

        {suggestedEqualShare !== null && (
          <p className="trip-money-equal-share">
            Suggested equal share (illustrative, not a binding debt): £{suggestedEqualShare.toFixed(2)} each,
            based on the current target and traveller count.
          </p>
        )}

        <h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1.05rem', color: '#2d3748' }}>
          Traveller contribution positions
        </h3>
        {allParticipants.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No travellers on this pot yet.</p>
        ) : (
          <div className="trip-money-member-list">
            {allParticipants.map((participant) => {
              const participantId = participant._id;
              const netRecorded = calculateUserNetRecorded(participantId);
              const recordedDisplay = Math.max(0, netRecorded);
              let positionLabel = 'Tracking';
              let positionClass = 'trip-money-status-neutral';
              let positionDetail = '';

              if (suggestedEqualShare !== null) {
                const delta = recordedDisplay - suggestedEqualShare;
                if (Math.abs(delta) < 0.01) {
                  positionLabel = 'Matches suggested share';
                  positionClass = 'trip-money-status-complete';
                  positionDetail = `Recorded £${recordedDisplay.toFixed(2)} · Suggested £${suggestedEqualShare.toFixed(2)}`;
                } else if (delta > 0) {
                  positionLabel = 'Above suggested share';
                  positionClass = 'trip-money-status-complete';
                  positionDetail = `Recorded £${recordedDisplay.toFixed(2)} · Suggested £${suggestedEqualShare.toFixed(2)} · £${delta.toFixed(2)} above suggested share`;
                } else {
                  positionLabel = 'Below suggested share';
                  positionClass = 'trip-money-status-pending';
                  positionDetail = `Recorded £${recordedDisplay.toFixed(2)} · Suggested £${suggestedEqualShare.toFixed(2)} · £${Math.abs(delta).toFixed(2)} below suggested share`;
                }
              } else {
                positionDetail = `Recorded £${recordedDisplay.toFixed(2)}`;
              }

              return (
                <div key={`closeout-${participantId}`} className="trip-money-member-row">
                  <div className="trip-money-member-main">
                    <div>
                      <strong>
                        {participant.firstName} {participant.lastName}
                        {String(participantId) === String(userId) ? ' (you)' : ''}
                      </strong>
                      <div className="trip-money-member-meta">{positionDetail}</div>
                    </div>
                    <span className={`trip-money-status-pill ${positionClass}`}>{positionLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1.05rem', color: '#2d3748' }}>
          Settlement records
        </h3>
        {pendingSettlementRequests.length === 0 ? (
          <p style={{ color: '#4a5568', fontSize: '0.95rem' }}>
            No pending settlement records for this pot.
          </p>
        ) : (
          <div className="trip-money-member-list">
            {pendingSettlementRequests.map((req) => {
              const currentUserId = getCurrentUserId();
              const requesterId =
                typeof req.requestedBy === 'object' ? req.requestedBy?._id : req.requestedBy;
              const isRequester = String(requesterId) === String(currentUserId);
              const hasApproved = (req.approvals || []).some((a: any) => {
                const approvalUserId = typeof a.user === 'object' ? a.user?._id : a.user;
                return String(approvalUserId) === String(currentUserId);
              });
              const hasRejected = (req.rejections || []).some((r: any) => {
                const rejectionUserId = typeof r.user === 'object' ? r.user?._id : r.user;
                return String(rejectionUserId) === String(currentUserId);
              });
              const canAct =
                !isArchived && !isRequester && !hasApproved && !hasRejected && req.status === 'pending';

              return (
                <div key={req._id} className="trip-money-member-row">
                  <div className="trip-money-member-main">
                    <div>
                      <strong>£{(req.amount || 0).toFixed(2)} settlement record</strong>
                      <div className="trip-money-member-meta">
                        Requested by{' '}
                        {req.requestedBy
                          ? `${req.requestedBy.firstName || ''} ${req.requestedBy.lastName || ''}`.trim() ||
                            req.requestedBy.email
                          : 'a traveller'}
                        {req.description ? ` · ${req.description}` : ''}
                      </div>
                    </div>
                    <span className="trip-money-status-pill trip-money-status-pending">
                      Pending review
                    </span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#4a5568' }}>
                    Approvals: {req.approvals?.length || 0} / {req.requiredApprovals || 0}. Approving records a ledger
                    settlement — SHARE does not send bank payments.
                  </p>
                  {canAct && (
                    <div className="trip-money-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => handleApproveSettlement(req._id)}
                      >
                        Approve settlement record
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRejectSettlement(req._id)}
                      >
                        Reject settlement record
                      </button>
                    </div>
                  )}
                  {!isArchived && isRequester && req.status === 'pending' && (
                    <div className="trip-money-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCancelSettlement(req._id)}
                      >
                        Cancel settlement request
                      </button>
                    </div>
                  )}
                  {hasApproved && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#22543d' }}>
                      You have approved this settlement request
                    </p>
                  )}
                  {hasRejected && (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#742a2a' }}>
                      You have rejected this settlement request
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isArchived && (
          <>
            <h3 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1.05rem', color: '#2d3748' }}>
              Organiser next steps
            </h3>
            <div className="trip-money-actions">
              {!hasTarget && isOwner && (
                <button className="btn btn-primary" onClick={handleEditClick}>
                  Set contribution target
                </button>
              )}
              {closeOutStatus === 'still_collecting' && (
                <button className="btn btn-primary" onClick={handleTransferClick}>
                  Record contribution
                </button>
              )}
              {(closeOutStatus === 'ready_to_review' || closeOutStatus === 'review_difference') && (
                <button className="btn btn-primary" onClick={handlePayClick}>
                  Request settlement record
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  document.getElementById('traveller-contributions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Review traveller contributions
              </button>
              {isOwner && (
                <button className="btn btn-secondary" onClick={handleEditClick}>
                  Edit contribution target
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  document.getElementById('group-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                Review activity history
              </button>
            </div>
          </>
        )}
        <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: '#718096' }}>
          There is no “close account” or automatic refund action in SHARE today. When the group is finished reviewing,
          use your own bank apps or cash to settle any real-world differences you agree on.
        </p>
      </div>

      {isOwner && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#718096' }}>
            Organiser actions
          </p>
          <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Trip Money settings</h2>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: 0 }}>
            Administration only — this does not move money or change recorded history totals.
          </p>
          <div className="trip-money-actions" style={{ flexWrap: 'wrap' }}>
            {!isArchived && account.members.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOrganiserTransferId('');
                  setShowOrganiserTransferModal(true);
                }}
              >
                Transfer organiser role
              </button>
            )}
            {!isArchived && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowArchiveModal(true)}>
                Archive Trip Money
              </button>
            )}
            {isArchived && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ color: '#c53030' }}
                onClick={() => setShowPermanentDeleteModal(true)}
              >
                Delete permanently
              </button>
            )}
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Edit trip pot details</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Date</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editForm.targetDate}
                  onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  {isArchived ? 'Close' : 'Cancel'}
                </button>
                {!isArchived && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editSubmitting}
                    style={{ flex: 1 }}
                  >
                    {editSubmitting ? <span className="spinner"></span> : 'Save Changes'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Payment Modal */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Record contribution</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            {loadingPersonalBalance ? (
              <p style={{ color: '#4a5568' }}>Loading personal tracked total...</p>
            ) : personalBalance !== null ? (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                Personal tracked total: <strong>£{personalBalance.toFixed(2)}</strong>
              </p>
            ) : (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                Personal tracked total unavailable.
              </p>
            )}
            <p style={{ color: '#4a5568', fontSize: '0.85rem' }}>
              This updates the group ledger only — SHARE does not move bank funds.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleTransferSubmit}>
              <div className="form-group">
                <label className="form-label">Contribution amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  placeholder="e.g., Accommodation deposit share"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={transferSubmitting}
                  style={{ flex: 1 }}
                >
                  {transferSubmitting ? <span className="spinner"></span> : 'Record contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Request settlement record</h2>
              <button
                onClick={() => setShowPayModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            <p style={{ color: '#4a5568', marginTop: 0 }}>
              Settlement amount to record: <strong>£{calculateBalance().toFixed(2)}</strong>
            </p>

            {loadingPersonalBalance ? (
              <p style={{ color: '#4a5568' }}>Loading personal tracked total...</p>
            ) : personalBalance !== null ? (
              <p style={{ color: '#4a5568' }}>
                Personal tracked total: <strong>£{personalBalance.toFixed(2)}</strong>
              </p>
            ) : (
              <p style={{ color: '#4a5568' }}>
                Personal tracked total unavailable.
              </p>
            )}
            <p style={{ color: '#4a5568', fontSize: '0.85rem' }}>
              Group approval records this against the trip pot ledger. SHARE does not send a bank payment.
            </p>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handlePaySubmit}>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={paySubmitting}
                  style={{ flex: 1 }}
                >
                  {paySubmitting ? <span className="spinner"></span> : 'Request settlement record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Account Modal */}
      {showRemoveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Leave shared trip costs</h2>
              <button
                onClick={() => setShowRemoveModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            {isOwner ? (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                You are the creator. Select a new owner to transfer creator rights before you leave.
              </p>
            ) : (
              <p style={{ color: '#4a5568', marginTop: 0 }}>
                This will remove you from these shared trip costs.
              </p>
            )}

            {isOwner && account.members.length === 0 && (
              <p style={{ color: '#e53e3e' }}>
                You need at least one member to transfer ownership.
              </p>
            )}

            {isOwner && account.members.length > 0 && (
              <div className="form-group">
                <label className="form-label">New Owner</label>
                <select
                  className="form-input"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  required
                >
                  <option value="">Select member</option>
                  {account.members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveAccount}
                className="btn btn-danger"
                disabled={removeSubmitting || (isOwner && account.members.length === 0)}
                style={{ flex: 1 }}
              >
                {removeSubmitting ? <span className="spinner"></span> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '500px', 
            maxHeight: '90vh', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h2 style={{ margin: 0 }}>Reverse recorded contribution</h2>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setWithdrawDescription('');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#4a5568'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#0369a1', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                Available to reverse (recorded):
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
                £{availableWithdrawal.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#0369a1', margin: '0.5rem 0 0 0' }}>
                Your recorded contributions minus any previous reversals. This does not withdraw bank funds.
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit}>
              <div className="form-group">
                <label className="form-label">Amount to reverse (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableWithdrawal}
                  className="form-input"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  placeholder="0.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Maximum: £{availableWithdrawal.toFixed(2)}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawDescription}
                  onChange={(e) => setWithdrawDescription(e.target.value)}
                  placeholder="Reason for reversing this recorded contribution"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                    setWithdrawDescription('');
                    setError('');
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={withdrawSubmitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableWithdrawal}
                  style={{ flex: 1 }}
                >
                  {withdrawSubmitting ? <span className="spinner"></span> : 'Reverse recorded contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOrganiserTransferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px' }}>
            <h2 style={{ marginTop: 0 }}>Transfer organiser role</h2>
            <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
              Choose a current traveller to become organiser. This transfers administration only — not money or recorded totals.
            </p>
            <div className="form-group">
              <label className="form-label">Make organiser</label>
              <select
                className="form-input"
                value={organiserTransferId}
                onChange={(e) => setOrganiserTransferId(e.target.value)}
              >
                <option value="">Select traveller</option>
                {account.members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowOrganiserTransferModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={organiserTransferSubmitting || !organiserTransferId}
                onClick={handleTransferOrganiserRole}
              >
                {organiserTransferSubmitting ? <span className="spinner"></span> : 'Transfer organiser role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px' }}>
            <h2 style={{ marginTop: 0 }}>Archive Trip Money</h2>
            <p style={{ color: '#4a5568' }}>
              Archive <strong>{account.name}</strong>? It will leave the active list. Recorded history stays available as read-only. SHARE does not hold or move money.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowArchiveModal(false)} disabled={archiveSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleArchiveTripMoney} disabled={archiveSubmitting}>
                {archiveSubmitting ? <span className="spinner"></span> : 'Archive Trip Money'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermanentDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '480px' }}>
            <h2 style={{ marginTop: 0, color: '#c53030' }}>Delete permanently</h2>
            <p style={{ color: '#4a5568' }}>
              Permanently remove the archived pot <strong>{account.name}</strong>? Recorded activity rows are kept with the pot name for history. The Trip Money pot itself will no longer open.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPermanentDeleteModal(false)} disabled={permanentDeleteSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handlePermanentDelete} disabled={permanentDeleteSubmitting}>
                {permanentDeleteSubmitting ? <span className="spinner"></span> : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccountDetail;

