import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canPaySinglePayment,
  singlePaymentAmount,
  contributionProgressTotal,
  isCompletedPaymentStatus,
  startOfLocalCalendarDay,
  startOfLocalCalendarDayIso,
  formatLocalYmd,
  parsePlannedContributors,
  parseContributionFrequency,
  parseContributionAgreement
} from '../utils/tripHome';
import ContributionPlanFields from './ContributionPlanFields';

const emptyCreateForm = () => {
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 3);
  return {
    name: '',
    description: '',
    targetAmount: '',
    targetDate: formatLocalYmd(defaultDate),
    plannedContributors: '',
    contributionFrequency: '',
    planAgreed: false
  };
};

interface SharedAccount {
  _id: string;
  name: string;
  description?: string;
  targetAmount?: number;
  targetDate?: string;
  plannedContributors?: number;
  perPersonAmount?: number;
  owner: string | { _id: string; firstName?: string; lastName?: string; email: string };
  members: string[] | Array<{ _id: string; firstName?: string; lastName?: string; email: string }>;
  financeRecords: any[];
  createdAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

const SharedAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<SharedAccount[]>([]);
  const [archivedAccounts, setArchivedAccounts] = useState<SharedAccount[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<SharedAccount | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: ''
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [personalBalance, setPersonalBalance] = useState<number | null>(null);
  const [loadingPersonalBalance, setLoadingPersonalBalance] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetDate: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [countdowns, setCountdowns] = useState<{ [key: string]: { days: number; hours: number; minutes: number; seconds: number } }>({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createEventId, setCreateEventId] = useState<string | null>(null);
  const createPrefillApplied = useRef(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const paymentsForAccount = (accountId: string) =>
    paymentRequests.filter((pr: any) => {
      const requestAccountId =
        typeof pr.sharedAccount === 'object' ? pr.sharedAccount?._id : pr.sharedAccount;
      return String(requestAccountId) === String(accountId);
    });

  const calculateAccountBalance = (account: SharedAccount): number => {
    return contributionProgressTotal(account.financeRecords, paymentsForAccount(account._id));
  };

  // Calculate remaining capacity (targetAmount - current balance)
  const calculateRemainingCapacity = (account: SharedAccount): number | null => {
    if (!account.targetAmount || account.targetAmount <= 0) {
      return null; // No limit set
    }
    const balance = calculateAccountBalance(account);
    return Math.max(0, account.targetAmount - balance);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/shared-accounts');
      setAccounts(response.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Please log in to view shared accounts');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please check your permissions.');
      } else {
        setError(`Failed to load shared accounts: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedAccounts = async () => {
    try {
      const response = await axios.get('/shared-accounts?archived=true');
      setArchivedAccounts(response.data);
    } catch {
      setArchivedAccounts([]);
    }
  };


  // Calculate countdown timer
  const calculateCountdown = (targetDate: string | undefined): { days: number; hours: number; minutes: number; seconds: number } | null => {
    if (!targetDate) return null;
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  };

  // Initialize and update countdowns every second
  useEffect(() => {
    const initializeCountdowns = () => {
      const newCountdowns: { [key: string]: { days: number; hours: number; minutes: number; seconds: number } } = {};
      accounts.forEach(account => {
        if (account.targetDate) {
          const countdown = calculateCountdown(account.targetDate);
          if (countdown) {
            newCountdowns[account._id] = countdown;
          }
        }
      });
      setCountdowns(newCountdowns);
    };

    initializeCountdowns();
    const timer = setInterval(initializeCountdowns, 1000);

    return () => clearInterval(timer);
  }, [accounts]);

  useEffect(() => {
    fetchAccounts();
    fetchPaymentRequests();
    // Poll for payment requests every 10 seconds
    const interval = setInterval(() => {
      fetchPaymentRequests();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = (prefillName?: string, eventId?: string) => {
    const next = emptyCreateForm();
    if (prefillName?.trim()) {
      next.name = prefillName.trim();
    }
    setCreateForm(next);
    setCreateEventId(eventId?.trim() || null);
    setCreateError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (createSubmitting) return;
    setShowCreateModal(false);
    setCreateError('');
    setCreateEventId(null);
    setCreateForm(emptyCreateForm());
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmitting) return;

    const name = createForm.name.trim();
    const description = createForm.description.trim();
    const amount = parseFloat(createForm.targetAmount);
    const targetDate = startOfLocalCalendarDay(createForm.targetDate);

    if (name.length < 2) {
      setCreateError('Enter an account name (at least 2 characters).');
      return;
    }
    if (!description) {
      setCreateError('Describe what you are collecting for.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setCreateError('Enter a valid target amount greater than zero.');
      return;
    }
    if (!targetDate || Number.isNaN(targetDate.getTime())) {
      setCreateError('Choose a valid target date.');
      return;
    }
    if (targetDate.getTime() <= Date.now()) {
      setCreateError('Target date must be in the future.');
      return;
    }
    const planned = parsePlannedContributors(createForm.plannedContributors);
    if ('error' in planned) {
      setCreateError(planned.error);
      return;
    }
    const frequency = parseContributionFrequency(createForm.contributionFrequency);
    if ('error' in frequency) {
      setCreateError(frequency.error);
      return;
    }
    const agreement = parseContributionAgreement(createForm.planAgreed);
    if ('error' in agreement) {
      setCreateError(agreement.error);
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const response = await axios.post('/shared-accounts', {
        name,
        description,
        targetAmount: amount,
        targetDate: targetDate.toISOString(),
        plannedContributors: planned.value,
        contributionFrequency: frequency.value,
        contributionPlanAgreed: true,
        ...(createEventId ? { eventId: createEventId } : {})
      });

      const created = response.data?.sharedAccount;
      setShowCreateModal(false);
      setCreateEventId(null);
      setCreateForm(emptyCreateForm());

      if (created?._id) {
        navigate(`/shared-accounts/${created._id}`);
        return;
      }

      await fetchAccounts();
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.map((item: any) => item.msg || item.message).filter(Boolean).join(', ') ||
        'Could not set up this Shared Account. Please check the details and try again.';
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Optional: /shared-accounts?name=Canada and/or ?event=<tripId>
  useEffect(() => {
    if (createPrefillApplied.current) return;
    const namePrefill = searchParams.get('name');
    const eventPrefill = searchParams.get('event');
    if (!namePrefill?.trim() && !eventPrefill?.trim()) return;

    createPrefillApplied.current = true;

    const applyPrefill = async () => {
      if (eventPrefill?.trim()) {
        try {
          const tripResponse = await axios.get(`/events/${eventPrefill.trim()}`);
          const linked = tripResponse.data?.tripMoney;
          if (linked?._id) {
            navigate(`/shared-accounts/${linked._id}`, { replace: true });
            return;
          }
          openCreateModal(namePrefill || tripResponse.data?.title, eventPrefill.trim());
        } catch {
          openCreateModal(namePrefill || undefined, eventPrefill.trim());
        }
      } else {
        openCreateModal(namePrefill || undefined);
      }

      const next = new URLSearchParams(searchParams);
      next.delete('name');
      next.delete('event');
      setSearchParams(next, { replace: true });
    };

    applyPrefill();
  }, [searchParams, setSearchParams, navigate]);

  useEffect(() => {
    if (searchParams.get('archived') !== '1') return;
    setShowArchived(true);
    fetchArchivedAccounts();
  }, [searchParams]);

  // Fetch personal balance (total balance from personal account)
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
      const balance = personalIncome - personalExpenses;
      setPersonalBalance(balance);
    } catch (err: any) {
      setPersonalBalance(null);
    } finally {
      setLoadingPersonalBalance(false);
    }
  };

  /**
   * Record a prototype contribution onto a Trip Money pot ledger.
   * Creates one FinanceRecord input on the pot. SHARE does not move bank funds.
   */
  const transferFundsToSharedAccount = async (
    account: SharedAccount,
    amount: number,
    description?: string
  ): Promise<void> => {
    if (!account || !account._id) {
      throw new Error('Invalid shared account');
    }

    if (account.targetAmount && account.targetAmount > 0) {
      const currentBalance = calculateAccountBalance(account);
      const newBalance = currentBalance + amount;
      if (newBalance > account.targetAmount) {
        const remaining = account.targetAmount - currentBalance;
        throw new Error(
          `Contribution would exceed the target of £${account.targetAmount.toFixed(2)}. ` +
          `Maximum you can record now: £${remaining.toFixed(2)}`
        );
      }
    }

    const date = new Date().toISOString();
    const transferDescription = description || `Contribution to ${account.name}`;

    await axios.post('/finance', {
      type: 'input',
      amount: amount,
      date: date,
      description: transferDescription,
      sharedAccount: account._id
    });

    // Wait for backend to process and refresh accounts
    await new Promise(resolve => setTimeout(resolve, 500));
    await fetchAccounts();
    await fetchPersonalBalance();
  };

  // Edit Account Handlers (removed - UI simplified to clickable cards only)
  // const handleEditClick = (account: SharedAccount) => {
  //   setSelectedAccount(account);
  //   setEditForm({
  //     name: account.name,
  //     description: account.description || '',
  //     targetAmount: account.targetAmount?.toString() || '',
  //     targetDate: account.targetDate ? new Date(account.targetDate).toISOString().slice(0, 16) : ''
  //   });
  //   setShowEditModal(true);
  // };

  // const handleNavigateToInvitations = (account: SharedAccount) => {
  //   navigate(`/invitations?account=${account._id}`);
  // };

  // Calculate participant count for an account (owner + members who accepted invitations)
  const getParticipantCount = (account: SharedAccount): number => {
    // Get owner ID
    const ownerId = typeof account.owner === 'string' ? account.owner : account.owner?._id;
    const ownerIdStr = ownerId?.toString();
    
    // Count members (people who accepted invitations and joined)
    const memberArray = Array.isArray(account.members) ? account.members : [];
    const uniqueMembers = new Set<string>();
    
    // Add owner if not null
    if (ownerIdStr) {
      uniqueMembers.add(ownerIdStr);
    }
    
    // Add all members (these are people who accepted invitations)
    memberArray.forEach((member: any) => {
      const memberId = typeof member === 'string' ? member : member?._id;
      if (memberId) {
        uniqueMembers.add(memberId.toString());
      }
    });
    
    // The participant count is: owner (1) + all members (who accepted and joined)
    // This represents the total number of people who are part of the shared account
    return uniqueMembers.size;
  };

  // Get list of participant names for an account
  const getParticipantNames = (account: SharedAccount): string[] => {
    const names: string[] = [];
    
    // Get owner name
    if (typeof account.owner === 'object' && account.owner) {
      const ownerName = account.owner.firstName && account.owner.lastName
        ? `${account.owner.firstName} ${account.owner.lastName}`
        : account.owner.email || 'Owner';
      names.push(ownerName);
    }
    
    // Get member names
    const memberArray = Array.isArray(account.members) ? account.members : [];
    memberArray.forEach((member: any) => {
      if (typeof member === 'object' && member) {
        const memberName = member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`
          : member.email || 'Member';
        names.push(memberName);
      }
    });
    
    return names;
  };

  // handlePayClick removed - UI simplified to clickable cards only
  // const handlePayClick = (account: SharedAccount) => {
  //   const balance = calculateAccountBalance(account);
  //   if (balance <= 0) {
  //     setError('No balance to pay. The shared account balance is £0.00 or negative.');
  //     return;
  //   }
  //   setSelectedAccount(account);
  //   setShowPayModal(true);
  //   fetchPersonalBalance();
  // };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const recorded = calculateAccountBalance(selectedAccount);
    const amount = singlePaymentAmount(selectedAccount.targetAmount);
    if (
      amount === null ||
      !canPaySinglePayment(recorded, selectedAccount.targetAmount, !!selectedAccount.isDeleted)
    ) {
      setError('Available once the contribution target is reached.');
      return;
    }

    setPaySubmitting(true);
    setError('');

    try {
      await axios.post('/payment-requests', {
        sharedAccountId: selectedAccount._id,
        amount,
        description: `Payment request for ${selectedAccount.name}`
      });

      // Refresh payment requests and accounts
      await fetchPaymentRequests();
      await fetchAccounts();
      
      setShowPayModal(false);
      setSelectedAccount(null);
      setError(''); // Clear any errors
      // Show success message
      alert('Payment request created. Members must approve before it is recorded. SHARE does not send bank payments.');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create payment request';
      setError(errorMessage);
    } finally {
      setPaySubmitting(false);
    }
  };

  // Fetch payment requests
  const fetchPaymentRequests = async () => {
    try {
      const response = await axios.get('/payment-requests');
      setPaymentRequests(response.data);
    } catch (err: any) {
      console.error('Failed to fetch payment requests:', err);
    }
  };

  // Approve a payment request
  const handleApprovePayment = async (requestId: string) => {
    try {
      await axios.post(`/payment-requests/${requestId}/approve`);
      await fetchPaymentRequests();
      await fetchAccounts();
      setError(''); // Clear any errors
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to approve payment';
      setError(errorMessage);
    }
  };

  // Reject a payment request
  const handleRejectPayment = async (requestId: string) => {
    try {
      await axios.post(`/payment-requests/${requestId}/reject`);
      await fetchPaymentRequests();
      await fetchAccounts();
      setError(''); // Clear any errors
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to reject payment';
      setError(errorMessage);
    }
  };

  const handleCancelSettlement = async (requestId: string) => {
    try {
      await axios.post(`/payment-requests/${requestId}/cancel`);
      await fetchPaymentRequests();
      await fetchAccounts();
      setError('');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to cancel payment request';
      setError(errorMessage);
    }
  };

  // handleDeleteClick removed - UI simplified to clickable cards only
  // const handleDeleteClick = (account: SharedAccount) => {
  //   setSelectedAccount(account);
  //   setShowDeleteModal(true);
  // };

  const handleDeleteSubmit = async () => {
    if (!selectedAccount) return;

    setDeleteSubmitting(true);
    setError('');

    try {
      await axios.delete(`/shared-accounts/${selectedAccount._id}`);
      setShowDeleteModal(false);
      setSelectedAccount(null);
      await fetchAccounts();
      if (showArchived) {
        await fetchArchivedAccounts();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to archive Shared Account';
      setError(errorMessage);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setEditSubmitting(true);
    setError('');

    try {
      const updateData: any = {};
      
      if (editForm.name !== selectedAccount.name) {
        updateData.name = editForm.name;
      }
      if (editForm.description !== (selectedAccount.description || '')) {
        updateData.description = editForm.description;
      }
      if (editForm.targetAmount && parseFloat(editForm.targetAmount) !== (selectedAccount.targetAmount || 0)) {
        updateData.targetAmount = parseFloat(editForm.targetAmount);
      }
      if (editForm.targetDate) {
        const newDate = startOfLocalCalendarDayIso(editForm.targetDate);
        const oldDate = selectedAccount.targetDate
          ? startOfLocalCalendarDayIso(selectedAccount.targetDate)
          : '';
        if (newDate && newDate !== oldDate) {
          updateData.targetDate = newDate;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await axios.put(`/shared-accounts/${selectedAccount._id}`, updateData);
        setShowEditModal(false);
        setSelectedAccount(null);
        await fetchAccounts();
      } else {
        setShowEditModal(false);
        setSelectedAccount(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update Shared Account';
      setError(errorMessage);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Transfer Funds UI Handlers (removed - UI simplified to clickable cards only)
  // const handleTransferClick = async (account: SharedAccount) => {
  //   setSelectedAccount(account);
  //   setShowTransferModal(true);
  //   setTransferForm({
  //     amount: '',
  //     description: `Transfer to ${account.name}`
  //   });
  //   // Fetch personal balance when opening modal
  //   await fetchPersonalBalance();
  // };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const amount = parseFloat(transferForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Check account limit before submitting
    if (selectedAccount.targetAmount && selectedAccount.targetAmount > 0) {
      const currentBalance = calculateAccountBalance(selectedAccount);
      const newBalance = currentBalance + amount;
      if (newBalance > selectedAccount.targetAmount) {
        const remaining = selectedAccount.targetAmount - currentBalance;
        setError(
          `Contribution would exceed the target of £${selectedAccount.targetAmount.toFixed(2)}. ` +
          `Maximum you can record now: £${remaining.toFixed(2)}`
        );
        return;
      }
    }

    setTransferSubmitting(true);
    setError('');

    try {
      await transferFundsToSharedAccount(
        selectedAccount,
        amount,
        transferForm.description || undefined
      );
      
      setShowTransferModal(false);
      setTransferForm({ amount: '', description: '' });
      setSelectedAccount(null);
      setPersonalBalance(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to record contribution';
      setError(errorMessage);
    } finally {
      setTransferSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        <p style={{ marginTop: '1rem', color: '#4a5568' }}>Loading shared accounts...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Shared Accounts</h1>
            <p style={{ margin: '0.35rem 0 0', color: '#4a5568', fontSize: '0.95rem' }}>
              Set up an account that is not yet on the main list.
            </p>
          </div>
        </div>
        <div style={{
          marginTop: '1rem',
          padding: '0.85rem 1rem',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          color: '#4a5568',
          fontSize: '0.9rem'
        }}>
          SHARE records and coordinates group contributions. It does not hold this tracked amount in a SHARE bank account.
        </div>
        <div style={{
          marginTop: '0.85rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => openCreateModal()}
          >
            Set up Shared Account
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={async () => {
              const next = !showArchived;
              setShowArchived(next);
              if (next) {
                await fetchArchivedAccounts();
              }
            }}
          >
            {showArchived ? 'Hide archived Shared Accounts' : 'Show archived Shared Accounts'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div>
              <strong>Error:</strong> {error}
              {error.includes('log in') && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  <a href="/login" style={{ color: '#3182ce', textDecoration: 'underline' }}>
                    Click here to log in
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Payment Requests */}
      {paymentRequests.filter((request: any) => request.status === 'pending').length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', background: '#fef3c7', border: '2px solid #f59e0b' }}>
          <h2 style={{ marginBottom: '1rem', color: '#92400e' }}>Pending payment approvals</h2>
          {paymentRequests.filter((request: any) => request.status === 'pending').map((request: any) => {
            // Get current user ID from auth context
            const currentUserId = user?.id || (user as any)?._id || '';
            const requesterId =
              typeof request.requestedBy === 'object' ? request.requestedBy?._id : request.requestedBy;
            const isRequester =
              String(requesterId) === String(currentUserId);
            const hasApproved = request.approvals?.some((a: any) => {
              const userId = typeof a.user === 'object' ? a.user?._id : a.user;
              return userId === currentUserId || userId?.toString() === currentUserId;
            });
            const hasRejected = request.rejections?.some((r: any) => {
              const userId = typeof r.user === 'object' ? r.user?._id : r.user;
              return userId === currentUserId || userId?.toString() === currentUserId;
            });
            const approvalCount = request.approvals?.length || 0;
            const requiredApprovals = request.requiredApprovals || 0;
            
            return (
              <div key={request._id} style={{
                background: 'white',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>
                      Payment request for: {request.sharedAccount?.name || 'Unknown Shared Account'}
                    </h3>
                    <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                      <strong>Amount:</strong> £{request.amount?.toFixed(2)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                      <strong>Requested by:</strong> {request.requestedBy?.firstName} {request.requestedBy?.lastName} ({request.requestedBy?.email})
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#4a5568', fontSize: '0.9rem' }}>
                      <strong>Description:</strong> {request.description}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#667eea', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      Approvals: {approvalCount} / {requiredApprovals} required
                    </p>
                  </div>
                </div>
                {request.status === 'pending' && !isRequester && !hasApproved && !hasRejected && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleApprovePayment(request._id)}
                      style={{ flex: 1 }}
                    >
                      Approve payment
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRejectPayment(request._id)}
                      style={{ flex: 1 }}
                    >
                      Reject payment
                    </button>
                  </div>
                )}
                {request.status === 'pending' && isRequester && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCancelSettlement(request._id)}
                      style={{ flex: 1 }}
                    >
                      Cancel payment request
                    </button>
                  </div>
                )}
                {hasApproved && (
                  <div style={{
                    background: '#f0fff4',
                    border: '1px solid #9ae6b4',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.5rem',
                    color: '#22543d'
                  }}>
                    You have approved this payment
                  </div>
                )}
                {hasRejected && (
                  <div style={{
                    background: '#fed7d7',
                    border: '1px solid #feb2b2',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.5rem',
                    color: '#742a2a'
                  }}>
                    You have rejected this payment
                  </div>
                )}
                {request.status === 'executed' && (
                  <div style={{
                    background: '#ebf8ff',
                    border: '1px solid #90cdf4',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.5rem',
                    color: '#2a4365'
                  }}>
                    Payment completed
                  </div>
                )}
                {request.status === 'rejected' && (
                  <div style={{
                    background: '#fed7d7',
                    border: '1px solid #feb2b2',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.5rem',
                    color: '#742a2a'
                  }}>
                    Payment rejected
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Accounts List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Shared Accounts</h2>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            onClick={() => openCreateModal()}
          >
            Set up Shared Account
          </button>
        </div>
        
        {accounts.length === 0 ? (
          <div style={{ color: '#4a5568', textAlign: 'center', padding: '2rem' }}>
            <p style={{ marginTop: 0, fontSize: '1.05rem', fontWeight: 600, color: '#2d3748' }}>
              No shared accounts yet
            </p>
            <p style={{ marginTop: 0 }}>
              Set up a Shared Account for a hotel deposit, tickets, birthday, or any group cost, then invite members.
            </p>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              SHARE only records contributions here — it does not hold money in a bank account.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openCreateModal()}
            >
              Set up Shared Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {accounts.map((account) => {
              const balance = calculateAccountBalance(account);
              const participantCount = getParticipantCount(account);
              const hasTarget = !!(account.targetAmount && account.targetAmount > 0);
              const remaining = hasTarget
                ? Math.max(0, (account.targetAmount as number) - balance)
                : null;
              const percent = hasTarget
                ? Math.min(100, Math.max(0, (balance / (account.targetAmount as number)) * 100))
                : 0;
              const hasPendingPayment = paymentRequests.some((pr: any) => {
                const accountId = typeof pr.sharedAccount === 'object' 
                  ? pr.sharedAccount._id 
                  : pr.sharedAccount;
                return String(accountId) === String(account._id) && pr.status === 'pending';
              });
              const hasCompletedPayment = paymentRequests.some((pr: any) => {
                const accountId = typeof pr.sharedAccount === 'object'
                  ? pr.sharedAccount._id
                  : pr.sharedAccount;
                return String(accountId) === String(account._id) && isCompletedPaymentStatus(pr.status);
              });
              const showPayNow = canPaySinglePayment(balance, account.targetAmount, false)
                && !hasPendingPayment
                && !hasCompletedPayment;
              
              return (
                <div
                  key={account._id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/shared-accounts/${account._id}`);
                  }}
                  className="trip-money-list-card"
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = '#f7fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        margin: '0 0 0.35rem 0', 
                        color: '#2d3748',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        {account.name}
                      </h3>
                      {account.description ? (
                        <p style={{ 
                          margin: '0 0 0.75rem 0', 
                          color: '#4a5568',
                          fontSize: '0.9rem'
                        }}>
                          {account.description}
                        </p>
                      ) : (
                        <p style={{ margin: '0 0 0.75rem 0', color: '#a0aec0', fontSize: '0.85rem' }}>
                          No description yet
                        </p>
                      )}

                      {hasTarget ? (
                        <div className="trip-money-list-progress">
                          <div className="trip-money-progress-meta">
                            <span>
                              £{balance.toFixed(2)} of £{(account.targetAmount as number).toFixed(2)} contributed
                            </span>
                            <span>{Math.round(percent)}%</span>
                          </div>
                          <div
                            className="trip-money-progress-track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(percent)}
                            aria-label={`${account.name} contribution progress`}
                          >
                            <div className="trip-money-progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="trip-money-list-stats">
                            {remaining !== null && remaining > 0.001 && (
                              <span>Still needed £{(remaining as number).toFixed(2)}</span>
                            )}
                            <span>{participantCount} {participantCount === 1 ? 'member' : 'members'}</span>
                            {hasPendingPayment && (
                              <span className="trip-money-pending-badge">Waiting for approval</span>
                            )}
                            {hasCompletedPayment && (
                              <span className="trip-money-pending-badge">Payment completed</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                              £{balance.toFixed(2)}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
                              Contributed so far · no target set
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.9rem', color: '#4a5568', fontWeight: '500' }}>
                              {participantCount} {participantCount === 1 ? 'member' : 'members'}
                            </span>
                          </div>
                          {hasPendingPayment && (
                            <div className="trip-money-pending-badge">Waiting for approval</div>
                          )}
                        </div>
                      )}
                    </div>
                    {showPayNow && (
                      <button
                        type="button"
                        className="btn btn-success pay-now-cta"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/shared-accounts/${account._id}?pay=now`);
                        }}
                      >
                        Pay now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showArchived && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '0.35rem' }}>Closed Shared Accounts</h2>
          <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: 0 }}>
            Kept for history. New contribution activity cannot be recorded on these accounts.
          </p>
          {archivedAccounts.length === 0 ? (
            <p style={{ color: '#718096' }}>No archived Shared Accounts.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {archivedAccounts.map((account) => (
                <div
                  key={account._id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open archived Shared Account ${account.name}`}
                  onClick={() => navigate(`/shared-accounts/${account._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/shared-accounts/${account._id}`);
                    }
                  }}
                  className="trip-money-list-card"
                  style={{
                    background: '#f7fafc',
                    border: '1px dashed #cbd5e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem' }}>{account.name}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Closed
                      </span>
                      <div style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.35rem' }}>
                        Read-only history
                      </div>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#4a5568' }}>View history →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Funds Modal */}
      {showTransferModal && selectedAccount && (
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
            maxWidth: '600px', 
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
              <h2 style={{ margin: 0 }}>Pay account</h2>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedAccount(null);
                  setTransferForm({ amount: '', description: '' });
                  setPersonalBalance(null);
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

            {/* Personal Account Balance Display */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                  Your personal tracked total
                </h3>
                {loadingPersonalBalance && (
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                )}
              </div>
              {personalBalance !== null ? (
                <p style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold', 
                  margin: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  £{personalBalance.toFixed(2)}
                </p>
              ) : (
                <p style={{ fontSize: '1rem', margin: 0, opacity: 0.8 }}>
                  Unable to load personal tracked total
                </p>
              )}
              <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                Based on your recorded personal activity — not a bank balance held by SHARE
              </p>
            </div>

            {/* Account Limit Information */}
            {selectedAccount.targetAmount && selectedAccount.targetAmount > 0 && (() => {
              const currentBalance = calculateAccountBalance(selectedAccount);
              const remaining = calculateRemainingCapacity(selectedAccount);
              const percentage = (currentBalance / selectedAccount.targetAmount) * 100;
              const isNearLimit = percentage >= 90;
              const isAtLimit = percentage >= 100;
              
              return (
                <div style={{
                  background: isAtLimit ? '#fee2e2' : isNearLimit ? '#fef3c7' : '#f0f9ff',
                  border: `1px solid ${isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#bae6fd'}`,
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{ 
                    color: isAtLimit ? '#991b1b' : isNearLimit ? '#92400e' : '#0369a1', 
                    fontSize: '0.9rem', 
                    margin: '0 0 0.5rem 0',
                    fontWeight: 'bold'
                  }}>
                    {isAtLimit ? 'Contribution target reached' : isNearLimit ? 'Near contribution target' : 'Contribution target'}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: isAtLimit ? '#991b1b' : isNearLimit ? '#92400e' : '#0369a1' }}>
                      Amount recorded:
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isAtLimit ? '#dc2626' : isNearLimit ? '#d97706' : '#0284c7' }}>
                      £{currentBalance.toFixed(2)} / £{selectedAccount.targetAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: isAtLimit ? '#991b1b' : isNearLimit ? '#92400e' : '#0369a1' }}>
                      Remaining to contribute:
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isAtLimit ? '#dc2626' : isNearLimit ? '#d97706' : '#0284c7' }}>
                      {remaining !== null ? `£${remaining.toFixed(2)}` : 'No limit'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e2e8f0',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{
                      width: `${Math.min(100, percentage)}%`,
                      height: '100%',
                      background: isAtLimit ? '#dc2626' : isNearLimit ? '#f59e0b' : '#0284c7',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  {isAtLimit && (
                    <p style={{ color: '#991b1b', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                      Cannot record more contributions. The contribution target has been reached.
                    </p>
                  )}
                </div>
              );
            })()}

            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                <strong>How it works:</strong> This records a contribution against your personal tracked total and this Shared Account. SHARE does not move bank funds.
                {selectedAccount.targetAmount && selectedAccount.targetAmount > 0 && (
                  <span> Contributions cannot exceed the target of £{selectedAccount.targetAmount.toFixed(2)}.</span>
                )}
              </p>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="form-group">
                <label className="form-label">Contribution amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(() => {
                    const remaining = selectedAccount.targetAmount && selectedAccount.targetAmount > 0 
                      ? calculateRemainingCapacity(selectedAccount) 
                      : null;
                    const maxFromPersonal = personalBalance !== null ? personalBalance : Infinity;
                    const maxFromLimit = remaining !== null ? remaining : Infinity;
                    return Math.min(maxFromPersonal, maxFromLimit);
                  })()}
                  className="form-input"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  Enter how much to record from your personal tracked total toward this Shared Account.
                  {personalBalance !== null && personalBalance > 0 && (
                    <span style={{ display: 'block', marginTop: '0.25rem', color: '#667eea', fontWeight: 'bold' }}>
                      Available in personal tracked total: £{personalBalance.toFixed(2)}
                    </span>
                  )}
                  {selectedAccount.targetAmount && selectedAccount.targetAmount > 0 && (() => {
                    const remaining = calculateRemainingCapacity(selectedAccount);
                    if (remaining !== null && remaining < (personalBalance || Infinity)) {
                      return (
                        <span style={{ display: 'block', marginTop: '0.25rem', color: '#d97706', fontWeight: 'bold' }}>
                          Remaining to contribute (target): £{remaining.toFixed(2)}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
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
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedAccount(null);
                    setTransferForm({ amount: '', description: '' });
                    setPersonalBalance(null);
                  }}
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
                  {transferSubmitting ? <span className="spinner"></span> : 'Pay account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Trip Money Modal */}
      {showCreateModal && (
        <div
          style={{
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
          }}
          onClick={closeCreateModal}
        >
          <div
            className="card"
            style={{
              width: '90%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ margin: 0 }}>Set up Shared Account</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={createSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: createSubmitting ? 'not-allowed' : 'pointer',
                  color: '#4a5568'
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p style={{ color: '#4a5568', marginTop: 0, fontSize: '0.9rem' }}>
              Create a Shared Account for a hotel deposit, tickets, birthday, or any group cost.
            </p>
            {createEventId && (
              <p style={{ color: '#2c5282', marginTop: 0, fontSize: '0.9rem' }}>
                This Shared Account will be linked and will open from the main list next time.
              </p>
            )}

            {createError && (
              <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label" htmlFor="trip-money-name">Account name</label>
                <input
                  id="trip-money-name"
                  type="text"
                  className="form-input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="e.g. Barcelona Holiday, Sarah's 30th"
                  disabled={createSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trip-money-description">What are you collecting for?</label>
                <textarea
                  id="trip-money-description"
                  className="form-input"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  required
                  rows={3}
                  placeholder="Accommodation deposit, tickets, shared meals…"
                  disabled={createSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trip-money-target-amount">Total goal</label>
                <input
                  id="trip-money-target-amount"
                  type="number"
                  className="form-input"
                  value={createForm.targetAmount}
                  onChange={(e) => setCreateForm({ ...createForm, targetAmount: e.target.value })}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="1000.00"
                  disabled={createSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="trip-money-target-date">Date money is needed</label>
                <input
                  id="trip-money-target-date"
                  type="date"
                  className="form-input"
                  value={createForm.targetDate}
                  onChange={(e) => setCreateForm({ ...createForm, targetDate: e.target.value })}
                  required
                  min={formatLocalYmd(new Date(Date.now() + 86400000))}
                  disabled={createSubmitting}
                />
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#718096' }}>
                  Must be a future date — when you hope the group has recorded enough contributions.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="legacy-planned-contributors">
                  How many people will contribute?
                </label>
                <input
                  id="legacy-planned-contributors"
                  type="number"
                  className="form-input"
                  value={createForm.plannedContributors}
                  onChange={(e) => setCreateForm({ ...createForm, plannedContributors: e.target.value })}
                  required
                  min="1"
                  max="50"
                  step="1"
                  placeholder="4"
                  disabled={createSubmitting}
                />
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#718096' }}>
                  Include yourself.
                </p>
              </div>

              <ContributionPlanFields
                targetAmount={createForm.targetAmount}
                plannedContributors={createForm.plannedContributors}
                deadline={createForm.targetDate}
                frequency={createForm.contributionFrequency}
                agreed={createForm.planAgreed}
                onFrequencyChange={(frequency) => setCreateForm({ ...createForm, contributionFrequency: frequency })}
                onAgreedChange={(agreed) => setCreateForm({ ...createForm, planAgreed: agreed })}
                disabled={createSubmitting}
                idPrefix="legacy-create"
              />

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={closeCreateModal}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={createSubmitting}
                >
                  {createSubmitting ? <span className="spinner"></span> : 'Create Shared Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && selectedAccount && (
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
            maxWidth: '600px', 
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
              <h2 style={{ margin: 0 }}>View / edit Shared Account</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAccount(null);
                  setEditForm({ name: '', description: '', targetAmount: '', targetDate: '' });
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

            {/* Account Details Section */}
            <div style={{
              background: '#f7fafc',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#2d3748', 
                marginBottom: '1rem',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '0.5rem'
              }}>
                Account Information
              </h3>
              
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {/* Participants */}
                <div style={{ 
                  color: '#4a5568', 
                  fontSize: '0.9rem'
                }}>
                  <strong>Members:</strong>{' '}
                  <span style={{ color: '#2b6cb0' }}>
                    {getParticipantCount(selectedAccount)} {getParticipantCount(selectedAccount) === 1 ? 'person' : 'people'} (invited and accepted)
                  </span>
                  {getParticipantNames(selectedAccount).length > 0 && (
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0.5rem 0 0 0',
                      paddingLeft: '1rem'
                    }}>
                      {getParticipantNames(selectedAccount).map((name, index) => (
                        <li key={index} style={{
                          padding: '2px 0',
                          fontSize: '0.85rem',
                          color: '#4a5568'
                        }}>
                          • {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Records */}
                <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>
                  <strong>Records:</strong> {selectedAccount.financeRecords?.length || 0}
                </p>

                {/* Created Date */}
                {selectedAccount.createdAt && (
                  <p style={{ color: '#4a5568', fontSize: '0.9rem', margin: 0 }}>
                    <strong>Created:</strong> {new Date(selectedAccount.createdAt).toLocaleDateString()}
                  </p>
                )}

                {/* Payment Calculations */}
                {selectedAccount.targetAmount && selectedAccount.targetAmount > 0 && (() => {
                  const participantCount = getParticipantCount(selectedAccount);
                  const perPersonAmount = selectedAccount.targetAmount / participantCount;
                  const timeRemaining = selectedAccount.targetDate 
                    ? Math.max(0, new Date(selectedAccount.targetDate).getTime() - new Date().getTime())
                    : 0;
                  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
                  const weeksRemaining = Math.ceil(daysRemaining / 7);
                  const monthsRemaining = Math.ceil(daysRemaining / 30);
                  const weeklyAmount = weeksRemaining > 0 ? perPersonAmount / weeksRemaining : perPersonAmount;
                  const monthlyAmount = monthsRemaining > 0 ? perPersonAmount / monthsRemaining : perPersonAmount;

                  return (
                    <div style={{ 
                      background: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{ color: '#92400e', fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                        Payment guidance:
                      </p>
                      <div style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '0.5rem' }}>
                        <p style={{ margin: '0.25rem 0' }}>
                          <strong>Total Needed:</strong> £{selectedAccount.targetAmount.toFixed(2)}
                        </p>
                        <p style={{ margin: '0.25rem 0' }}>
                          <strong>Members:</strong> {participantCount}
                        </p>
                        <p style={{ margin: '0.25rem 0', fontWeight: 'bold', color: '#78350f' }}>
                          <strong>Per Person:</strong> £{perPersonAmount.toFixed(2)}
                        </p>
                      </div>
                      {daysRemaining > 0 && (
                        <div style={{ 
                          borderTop: '1px solid #f59e0b', 
                          paddingTop: '0.5rem', 
                          marginTop: '0.5rem' 
                        }}>
                          <p style={{ color: '#92400e', fontSize: '0.8rem', margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>
                            Contribution options:
                          </p>
                          <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                            <p style={{ margin: '0.25rem 0' }}>
                              <strong>Weekly:</strong> £{weeklyAmount.toFixed(2)}/week for {weeksRemaining} week{weeksRemaining !== 1 ? 's' : ''}
                            </p>
                            <p style={{ margin: '0.25rem 0' }}>
                              <strong>Monthly:</strong> £{monthlyAmount.toFixed(2)}/month for {monthsRemaining} month{monthsRemaining !== 1 ? 's' : ''}
                            </p>
                            <p style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>
                              <strong>Or:</strong> Single payment of £{perPersonAmount.toFixed(2)} anytime
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Time Remaining - Simplified */}
                {selectedAccount.targetDate && (
                  <div style={{ 
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    <p style={{ color: '#0369a1', fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                      Time Remaining:
                    </p>
                    {countdowns[selectedAccount._id] ? (
                      <p style={{ color: '#0369a1', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                        {countdowns[selectedAccount._id].days > 0 && `${countdowns[selectedAccount._id].days} day${countdowns[selectedAccount._id].days !== 1 ? 's' : ''}, `}
                        {countdowns[selectedAccount._id].hours}h {countdowns[selectedAccount._id].minutes}m
                      </p>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#0369a1' }}>Calculating...</span>
                    )}
                    <p style={{ color: '#0369a1', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                      Target: {new Date(selectedAccount.targetDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  placeholder="Account name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="What is this account for?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Amount (£)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g., 100.00"
                />
                <p style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.25rem' }}>
                  The contribution target for this Shared Account.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="legacy-edit-date">Date</label>
                <input
                  id="legacy-edit-date"
                  type="date"
                  className="form-input"
                  value={editForm.targetDate}
                  onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAccount(null);
                    setEditForm({ name: '', description: '', targetAmount: '', targetDate: '' });
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting}
                  style={{ flex: 1 }}
                >
                  {editSubmitting ? <span className="spinner"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Full Balance Modal */}
      {showPayModal && selectedAccount && (
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
              <h2 style={{ margin: 0 }}>Final payment</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedAccount(null);
                  setPersonalBalance(null);
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, fontWeight: 'normal' }}>
                Shared Account: {selectedAccount.name}
              </h3>
              <p style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                margin: '0.5rem 0 0 0',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                £{calculateAccountBalance(selectedAccount).toFixed(2)}
              </p>
              <p style={{ fontSize: '0.75rem', margin: '0.5rem 0 0 0', opacity: 0.8 }}>
                Amount currently contributed
              </p>
            </div>

            {personalBalance !== null && (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{ color: '#92400e', fontSize: '0.9rem', margin: 0 }}>
                  <strong>Your personal tracked total:</strong> £{personalBalance.toFixed(2)}
                </p>
              </div>
            )}

            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#991b1b', fontSize: '0.9rem', margin: 0 }}>
                Prototype: this records the group’s proposed final payment. No money is transferred.
              </p>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedAccount(null);
                    setPersonalBalance(null);
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={paySubmitting || calculateAccountBalance(selectedAccount) <= 0}
                  style={{ flex: 1 }}
                >
                  {paySubmitting ? <span className="spinner"></span> : 'Create payment request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && selectedAccount && (
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
              <h2 style={{ margin: 0, color: '#2b6cb0' }}>Archive Shared Account</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
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
              background: '#ebf8ff',
              border: '1px solid #90cdf4',
              borderRadius: '6px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#2c5282', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                Archive this Shared Account?
              </p>
              <p style={{ color: '#2c5282', fontSize: '0.9rem', margin: 0 }}>
                <strong>"{selectedAccount.name}"</strong> will leave your active list. Recorded history stays available as read-only. This does not move or delete real-world money.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAccount(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="btn btn-primary"
                disabled={deleteSubmitting}
                style={{ flex: 1 }}
              >
                {deleteSubmitting ? <span className="spinner"></span> : 'Archive Shared Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedAccounts;
