import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ContributionPlanFields from './ContributionPlanFields';
import {
  ContributionFrequency,
  buildPersonalSavingsPlan,
  calendarDateKey,
  findUserContributionPlan,
  formatMoneyAmount,
  frequencyMeta,
  hasAgreedContributionPlan,
  plannedContributorsForAccount,
  StoredContributionPlan
} from '../utils/tripHome';
import { userFacingError } from '../utils/userFacingError';

interface MemberContributionPlanPanelProps {
  accountId: string;
  accountName: string;
  targetAmount?: number | null;
  plannedContributors?: number | null;
  deadline?: string | Date | null;
  owner?: unknown;
  members?: unknown[] | null;
  contributionPlans?: StoredContributionPlan[] | null;
  currentUserId: string;
  contributed: number;
  recordedTotal?: number;
  archived?: boolean;
  startExpanded?: boolean;
  onDismissed?: () => void;
  onSaved?: () => void;
}

const MemberContributionPlanPanel: React.FC<MemberContributionPlanPanelProps> = ({
  accountId,
  accountName,
  targetAmount,
  plannedContributors,
  deadline,
  owner,
  members,
  contributionPlans,
  currentUserId,
  contributed,
  recordedTotal,
  archived = false,
  startExpanded = false,
  onDismissed,
  onSaved
}) => {
  const resolvedContributors = plannedContributorsForAccount({
    plannedContributors,
    owner: owner as never,
    members: members as never
  });
  const storedPlan = findUserContributionPlan(contributionPlans || undefined, currentUserId);
  const hasAgreed = hasAgreedContributionPlan(contributionPlans || undefined, currentUserId);
  const savings = buildPersonalSavingsPlan({
    id: accountId,
    name: accountName,
    targetAmount,
    plannedContributors,
    owner: owner as never,
    members: members as never,
    contributed,
    recordedTotal,
    deadline,
    userPlan: storedPlan
  });

  const [expanded, setExpanded] = useState(startExpanded);
  const [frequency, setFrequency] = useState<ContributionFrequency | ''>('');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (startExpanded) setExpanded(true);
  }, [startExpanded]);

  if (!currentUserId || !savings) return null;

  if (hasAgreed && storedPlan) {
    const cadence = frequencyMeta(storedPlan.frequency).label;
    const persisted = Number(storedPlan.scheduledAmount);
    const amount = Number.isFinite(persisted) && persisted > 0
      ? persisted
      : savings.nextAutomaticAmount ?? savings.recurringAmount;
    return (
      <div className="card member-contribution-plan-card" data-testid="member-contribution-plan-summary">
        <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Automatic contribution plan</h2>
        <p className="member-contribution-plan-summary-line">
          {cadence}
          {amount != null && amount > 0 ? ` · ${formatMoneyAmount(amount)}` : ''}
        </p>
        {savings.nextDueLabel && savings.status === 'active' && (
          <p className="member-contribution-plan-summary-next">Next: {savings.nextDueLabel}</p>
        )}
        <p className="contribution-plan-disclaimer">
          Prototype automatic payments — no real money is moved.
        </p>
      </div>
    );
  }

  if (archived) return null;

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!frequency || !agreed || saving) return;
    setSaving(true);
    setError('');
    try {
      await axios.put(`/shared-accounts/${accountId}/contribution-plan`, {
        frequency,
        agreed: true
      });
      setExpanded(false);
      onSaved?.();
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not save your contribution plan'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card member-contribution-plan-card" data-testid="member-contribution-plan-setup">
      <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Set up your contribution plan</h2>
      <p className="member-contribution-plan-intro">
        Choose how often you want to contribute towards your share of this Shared Account.
      </p>
      {!expanded ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setExpanded(true)}
        >
          Set up your contribution plan
        </button>
      ) : (
        <form onSubmit={savePlan}>
          <ContributionPlanFields
            targetAmount={targetAmount != null ? String(targetAmount) : ''}
            plannedContributors={String(resolvedContributors)}
            deadline={calendarDateKey(deadline) || savings.deadline || ''}
            frequency={frequency}
            agreed={agreed}
            contributed={contributed}
            onFrequencyChange={setFrequency}
            onAgreedChange={setAgreed}
            disabled={saving}
            idPrefix={`member-${accountId}`}
            disclaimer="Prototype automatic payments — no real money is moved."
          />
          {error && <p style={{ color: '#c53030', margin: '0 0 0.75rem' }}>{error}</p>}
          <div className="personal-savings-plan-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !frequency || !agreed}
            >
              {saving ? 'Saving…' : 'Save contribution plan'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => {
                setExpanded(false);
                setFrequency('');
                setAgreed(false);
                setError('');
                onDismissed?.();
              }}
            >
              Not now
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MemberContributionPlanPanel;
