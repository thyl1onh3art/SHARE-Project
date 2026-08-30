import React from 'react';
import {
  calendarDaysRemaining,
  CONTRIBUTION_FREQUENCIES,
  ContributionFrequency,
  deadlineStateFromDays,
  formatMoneyAmount,
  frequencyMeta,
  parsePlannedContributors,
  plannedPersonalShare,
  remainingPersonalAmount,
  recurringAmountForFrequency,
  startOfLocalCalendarDay
} from '../utils/tripHome';

interface ContributionPlanFieldsProps {
  targetAmount: string;
  plannedContributors: string;
  deadline: string;
  frequency: string;
  agreed: boolean;
  onFrequencyChange: (frequency: ContributionFrequency) => void;
  onAgreedChange: (agreed: boolean) => void;
  disabled?: boolean;
  idPrefix?: string;
}

const ContributionPlanFields: React.FC<ContributionPlanFieldsProps> = ({
  targetAmount,
  plannedContributors,
  deadline,
  frequency,
  agreed,
  onFrequencyChange,
  onAgreedChange,
  disabled = false,
  idPrefix = 'create'
}) => {
  const planned = parsePlannedContributors(plannedContributors);
  const contributors = 'value' in planned ? planned.value : null;
  const target = parseFloat(targetAmount);
  const plannedShare = contributors && target > 0 ? plannedPersonalShare(target, contributors) : null;
  const remaining = remainingPersonalAmount(plannedShare, 0);
  const days = calendarDaysRemaining(deadline);
  const deadlineState = deadlineStateFromDays(days);
  const parsedFrequency = CONTRIBUTION_FREQUENCIES.find((option) => option.value === frequency);
  const recurringAmount = parsedFrequency
    ? recurringAmountForFrequency(remaining, days, parsedFrequency.value, deadlineState)
    : null;
  const deadlineDay = startOfLocalCalendarDay(deadline);
  const deadlineLabel = deadlineDay
    ? deadlineDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const showSummary = plannedShare !== null && parsedFrequency && deadlineLabel;

  return (
    <div className="contribution-plan-fields">
      {plannedShare !== null && (
        <div className="contribution-plan-live">
          <p className="contribution-plan-live-label">Your planned contribution</p>
          <p className="contribution-plan-live-value">{formatMoneyAmount(plannedShare)}</p>
        </div>
      )}

      <fieldset className="contribution-frequency-options" disabled={disabled}>
        <legend className="form-label">Choose how often you want to contribute</legend>
        {CONTRIBUTION_FREQUENCIES.map((option) => (
          <label key={option.value} className="contribution-frequency-option">
            <input
              type="radio"
              name={`${idPrefix}-contribution-frequency`}
              value={option.value}
              checked={frequency === option.value}
              onChange={() => onFrequencyChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {parsedFrequency && deadlineState === 'today' && remaining > 0 && (
        <p className="contribution-plan-live-note">
          Amount needed today {formatMoneyAmount(remaining)}
        </p>
      )}

      {parsedFrequency && deadlineState === 'future' && recurringAmount !== null && (
        <p className="contribution-plan-live-note">
          Scheduled contribution {formatMoneyAmount(recurringAmount)} {parsedFrequency.perLabel}
        </p>
      )}

      {showSummary && (
        <div className="contribution-plan-summary">
          <h3 className="contribution-plan-summary-title">Your contribution plan</h3>
          <dl>
            <div>
              <dt>Total goal</dt>
              <dd>{formatMoneyAmount(target)}</dd>
            </div>
            <div>
              <dt>People contributing</dt>
              <dd>{contributors}</dd>
            </div>
            <div>
              <dt>Your planned contribution</dt>
              <dd>{formatMoneyAmount(plannedShare)}</dd>
            </div>
            <div>
              <dt>Contribution frequency</dt>
              <dd>{parsedFrequency.label}</dd>
            </div>
            <div>
              <dt>Scheduled contribution</dt>
              <dd>
                {deadlineState === 'today'
                  ? `${formatMoneyAmount(remaining)} needed today`
                  : recurringAmount !== null
                    ? `${formatMoneyAmount(recurringAmount)} ${parsedFrequency.perLabel}`
                    : frequencyMeta(parsedFrequency.value).label}
              </dd>
            </div>
            <div>
              <dt>Goal date</dt>
              <dd>{deadlineLabel}</dd>
            </div>
          </dl>
        </div>
      )}

      <label className="contribution-plan-agree" htmlFor={`${idPrefix}-plan-agree`}>
        <input
          id={`${idPrefix}-plan-agree`}
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          disabled={disabled}
        />
        I agree to this contribution plan
      </label>
      <p className="contribution-plan-disclaimer">
        Prototype contribution plan — no automatic bank transfer is currently made.
      </p>
    </div>
  );
};

export default ContributionPlanFields;
