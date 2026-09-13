import React, { useEffect, useState } from 'react';
import ContributionPlanFields from './ContributionPlanFields';
import {
  CONTRIBUTION_FREQUENCIES,
  ContributionFrequency,
  PersonalSavingsPlan,
  StoredContributionPlan,
  buildPersonalSavingsPlan,
  calendarDateKey,
  findUserContributionPlan,
  formatMoneyAmount,
  frequencyMeta,
  hasAgreedContributionPlan,
  plannedContributorsForAccount,
  previewAgreedScheduledAmount
} from '../utils/tripHome';
import {
  cancelContributionPlan,
  pauseContributionPlan,
  resumeContributionPlan,
  saveContributionPlan
} from '../utils/contributionPlanApi';
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

function planDisplayAmount(
  storedPlan: StoredContributionPlan,
  savings: PersonalSavingsPlan
): number | null {
  const persisted = Number(storedPlan.scheduledAmount);
  if (Number.isFinite(persisted) && persisted > 0) return persisted;
  return savings.nextAutomaticAmount ?? savings.recurringAmount;
}

function cadenceAmountLabel(
  frequency: ContributionFrequency | string | null | undefined,
  amount: number | null | undefined
): string {
  const cadence = frequency ? frequencyMeta(frequency as ContributionFrequency).label : '';
  if (amount != null && amount > 0) {
    return `${cadence} · ${formatMoneyAmount(amount)}`;
  }
  return cadence;
}

const DISCLAIMER = 'Prototype automatic payments — no real money is moved.';

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
  const [changingFrequency, setChangingFrequency] = useState(false);
  const [pendingFrequency, setPendingFrequency] = useState<ContributionFrequency | ''>('');
  const [confirmingPause, setConfirmingPause] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [settingUpNewPlan, setSettingUpNewPlan] = useState(false);

  useEffect(() => {
    if (startExpanded) setExpanded(true);
  }, [startExpanded]);

  useEffect(() => {
    setChangingFrequency(false);
    setPendingFrequency('');
    setConfirmingPause(false);
    setConfirmingCancel(false);
    setSettingUpNewPlan(false);
    setFrequency('');
    setAgreed(false);
    setError('');
  }, [accountId, storedPlan?.frequency, storedPlan?.status, storedPlan?.scheduledAmount]);

  if (!currentUserId || !savings) return null;

  const runAction = async (work: () => Promise<unknown>) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await work();
      setChangingFrequency(false);
      setPendingFrequency('');
      setConfirmingPause(false);
      setConfirmingCancel(false);
      onSaved?.();
    } catch (err: unknown) {
      setError(userFacingError(err, 'Could not update your contribution plan'));
    } finally {
      setSaving(false);
    }
  };

  if (hasAgreed && storedPlan) {
    const status = savings.status;
    const currentFrequency = storedPlan.frequency as ContributionFrequency | undefined;
    const currentAmount = planDisplayAmount(storedPlan, savings);
    const currentLabel = cadenceAmountLabel(currentFrequency, currentAmount);
    const pendingAmount = pendingFrequency
      ? previewAgreedScheduledAmount(savings.remaining, deadline || savings.deadline, pendingFrequency)
      : null;
    const pendingLabel = pendingFrequency
      ? cadenceAmountLabel(pendingFrequency, pendingAmount)
      : '';
    const saveNewPlan = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!frequency || !agreed) return;
      await runAction(() => saveContributionPlan(accountId, frequency, { agreed: true }));
    };

    const canManage = !archived && (status === 'active' || status === 'paused');
    const showFrequencyConfirm = !!(
      changingFrequency
      && pendingFrequency
      && currentFrequency
      && pendingFrequency !== currentFrequency
    );

    return (
      <div className="card member-contribution-plan-card" data-testid="member-contribution-plan-summary">
        {status === 'cancelled' ? (
          <>
            <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Contribution plan cancelled</h2>
            <p className="member-contribution-plan-intro">
              Future automatic contributions are stopped.
            </p>
            <p className="member-contribution-plan-intro">
              Previous contributions remain in your account history.
            </p>
            {!archived && !settingUpNewPlan && (
              <div className="personal-savings-plan-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFrequency('');
                    setAgreed(false);
                    setSettingUpNewPlan(true);
                  }}
                >
                  Set up a new contribution plan
                </button>
              </div>
            )}
            {!archived && settingUpNewPlan && (
              <form onSubmit={saveNewPlan} data-testid="member-contribution-plan-new-setup">
                <p className="member-contribution-plan-intro">
                  Choose how often you want to contribute towards your remaining share of this Shared Account.
                </p>
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
                  idPrefix={`member-restart-${accountId}`}
                  disclaimer={DISCLAIMER}
                />
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
                      setSettingUpNewPlan(false);
                      setFrequency('');
                      setAgreed(false);
                    }}
                  >
                    Not now
                  </button>
                </div>
              </form>
            )}
          </>
        ) : status === 'completed' ? (
          <>
            <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Contribution plan completed</h2>
            <p className="member-contribution-plan-intro">
              Your planned contribution has been completed.
            </p>
          </>
        ) : status === 'paused' ? (
          <>
            <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Contribution plan paused</h2>
            {currentLabel && (
              <p className="member-contribution-plan-summary-line">{currentLabel}</p>
            )}
            <p className="member-contribution-plan-intro">
              No automatic contributions will be made while paused.
            </p>
          </>
        ) : (
          <>
            <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>Automatic contribution plan</h2>
            {currentLabel && (
              <p className="member-contribution-plan-summary-line">{currentLabel}</p>
            )}
            {savings.nextDueLabel && (
              <p className="member-contribution-plan-summary-next">Next: {savings.nextDueLabel}</p>
            )}
          </>
        )}

        {error && <p style={{ color: '#c53030', margin: '0 0 0.75rem' }}>{error}</p>}

        {canManage && changingFrequency && (
          <div className="member-contribution-plan-manage">
            <fieldset className="contribution-frequency-options" disabled={saving}>
              <legend className="form-label">Choose how often you want to contribute</legend>
              {CONTRIBUTION_FREQUENCIES.map((option) => (
                <label key={option.value} className="contribution-frequency-option">
                  <input
                    type="radio"
                    name={`manage-${accountId}-frequency`}
                    value={option.value}
                    checked={pendingFrequency === option.value}
                    onChange={() => setPendingFrequency(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            {showFrequencyConfirm && (
              <div className="personal-savings-cancel-confirm" role="region" aria-label="Change contribution frequency">
                <p>Change contribution frequency?</p>
                <p>Current: {currentLabel}</p>
                <p>New: {pendingLabel}</p>
                <p>Future automatic contributions will use the new schedule.</p>
                <p>Previous contributions will not change.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => runAction(() => saveContributionPlan(accountId, pendingFrequency))}
                >
                  Confirm change
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setChangingFrequency(false);
                    setPendingFrequency('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {!showFrequencyConfirm && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => {
                  setChangingFrequency(false);
                  setPendingFrequency('');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {canManage && confirmingPause && (
          <div className="personal-savings-cancel-confirm" role="region" aria-label="Pause automatic contributions">
            <p>Pause automatic contributions?</p>
            <p>No automatic contributions will be made while paused. Previous contributions will not change.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={() => runAction(() => pauseContributionPlan(accountId))}
            >
              Pause automatic contributions
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setConfirmingPause(false)}
            >
              Keep plan
            </button>
          </div>
        )}

        {canManage && confirmingCancel && (
          <div className="personal-savings-cancel-confirm" role="region" aria-label="Cancel contribution plan">
            <p>Cancel contribution plan?</p>
            <p>This stops future automatic contributions for this Shared Account.</p>
            <p>Your previous contributions and transaction history will remain.</p>
            <button
              type="button"
              className="btn btn-danger"
              disabled={saving}
              onClick={() => runAction(() => cancelContributionPlan(accountId))}
            >
              Cancel plan
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setConfirmingCancel(false)}
            >
              Keep plan
            </button>
          </div>
        )}

        {canManage && !changingFrequency && !confirmingPause && !confirmingCancel && (
          <div className="personal-savings-plan-actions">
            {status === 'paused' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => runAction(() => resumeContributionPlan(accountId))}
              >
                Resume automatic contributions
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => {
                setPendingFrequency(currentFrequency || '');
                setChangingFrequency(true);
              }}
            >
              Change frequency
            </button>
            {status === 'active' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={() => setConfirmingPause(true)}
              >
                Pause automatic contributions
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel plan
            </button>
          </div>
        )}

        {!(status === 'cancelled' && settingUpNewPlan) && (
          <p className="contribution-plan-disclaimer">{DISCLAIMER}</p>
        )}
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
      await saveContributionPlan(accountId, frequency, { agreed: true });
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
            disclaimer={DISCLAIMER}
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
