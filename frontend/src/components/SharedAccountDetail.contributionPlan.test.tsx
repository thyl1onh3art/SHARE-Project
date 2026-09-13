import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SharedAccountDetail from './SharedAccountDetail';
import {
  calendarDaysRemaining,
  deadlineStateFromDays,
  formatMoneyAmount,
  recurringAmountForFrequency
} from '../utils/tripHome';

function scheduledLabel(frequency: 'weekly' | 'fortnightly' | 'monthly') {
  const remaining = 200;
  const days = calendarDaysRemaining('2026-09-28');
  const amount = recurringAmountForFrequency(
    remaining,
    days,
    frequency,
    deadlineStateFromDays(days)
  );
  const perLabel = frequency === 'weekly'
    ? 'per week'
    : frequency === 'fortnightly'
      ? 'every 2 weeks'
      : 'per month';
  if (amount == null) {
    throw new Error(`Expected a scheduled amount for ${frequency}`);
  }
  return `Scheduled contribution ${formatMoneyAmount(amount)} ${perLabel}`;
}

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const authState = {
  user: {
    id: 'user-2',
    name: 'Alex Friend',
    firstName: 'Alex',
    lastName: 'Friend',
    email: 'alex@example.com'
  }
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    token: 'test-token',
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    sendVerificationCode: jest.fn(),
    verifyEmail: jest.fn(),
    updateProfile: jest.fn(),
    refreshUser: jest.fn(),
    deleteAccount: jest.fn()
  })
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const owner = {
  _id: 'user-1',
  firstName: 'Sam',
  lastName: 'Brown',
  email: 'sam@example.com'
};

const member = {
  _id: 'user-2',
  firstName: 'Alex',
  lastName: 'Friend',
  email: 'alex@example.com'
};

const memberB = {
  _id: 'user-3',
  firstName: 'Jo',
  lastName: 'Lee',
  email: 'jo@example.com'
};

function baseAccount(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'pot-1',
    name: 'Canada',
    description: 'Group pot',
    owner,
    members: [member],
    financeRecords: [],
    targetAmount: 600,
    plannedContributors: 3,
    targetDate: '2026-09-28',
    contributionPlans: [{
      user: owner._id,
      frequency: 'monthly',
      agreed: true,
      agreedAt: '2026-08-31T12:00:00.000Z',
      status: 'active',
      scheduledAmount: 200,
      nextContributionDate: '2026-09-30'
    }],
    createdAt: '2026-08-31T12:00:00.000Z',
    ...overrides
  };
}

function mockAccountFetch(
  account: Record<string, unknown>,
  records: Array<Record<string, unknown>> = []
) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
    }
    if (url.startsWith('/finance')) {
      return Promise.resolve({ data: records });
    }
    if (url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderDetail(path = '/shared-accounts/pot-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccountDetail invited member contribution plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState.user = {
      id: 'user-2',
      name: 'Alex Friend',
      firstName: 'Alex',
      lastName: 'Friend',
      email: 'alex@example.com'
    };
  });

  it('shows setup for an accepted member with no plan and keeps Pay account available', async () => {
    mockAccountFetch(baseAccount());
    renderDetail();

    expect(await screen.findByTestId('member-contribution-plan-setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Set up your contribution plan' })).toBeInTheDocument();
    expect(screen.getByText(/choose how often you want to contribute towards your share/i)).toBeInTheDocument();
    expect(screen.queryByTestId('member-contribution-plan-summary')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });

  it('opens the setup form after accept and saves an agreed weekly plan', async () => {
    const account = baseAccount();
    mockAccountFetch(account);
    (mockedAxios.put as jest.Mock).mockImplementation(async (_url: string, body: { frequency: string }) => {
      account.contributionPlans = [
        ...(account.contributionPlans as Array<Record<string, unknown>>),
        {
          user: member._id,
          frequency: body.frequency,
          agreed: true,
          status: 'active',
          scheduledAmount: body.frequency === 'weekly' ? 50 : 100,
          nextContributionDate: '2026-09-14'
        }
      ];
      return { data: account };
    });

    renderDetail('/shared-accounts/pot-1?setupPlan=1');

    const setup = await screen.findByTestId('member-contribution-plan-setup');
    expect(within(setup).getByRole('radio', { name: /^weekly$/i })).toBeInTheDocument();
    expect(screen.getByText(/prototype automatic payments — no real money is moved/i)).toBeInTheDocument();

    fireEvent.click(within(setup).getByRole('radio', { name: /^weekly$/i }));
    expect(screen.getByText(scheduledLabel('weekly'))).toBeInTheDocument();

    fireEvent.click(within(setup).getByRole('radio', { name: /every 2 weeks/i }));
    expect(screen.getByText(scheduledLabel('fortnightly'))).toBeInTheDocument();

    fireEvent.click(within(setup).getByRole('radio', { name: /^monthly$/i }));
    expect(screen.getByText(scheduledLabel('monthly'))).toBeInTheDocument();

    fireEvent.click(within(setup).getByRole('radio', { name: /^weekly$/i }));
    fireEvent.click(within(setup).getByLabelText(/i agree to this contribution plan/i));
    fireEvent.click(within(setup).getByRole('button', { name: /save contribution plan/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/shared-accounts/pot-1/contribution-plan',
        { frequency: 'weekly', agreed: true }
      );
    });

    expect(await screen.findByTestId('member-contribution-plan-summary')).toBeInTheDocument();
    expect(screen.getByText(/weekly · £50\.00/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Set up your contribution plan' })).not.toBeInTheDocument();
  });

  it('does not create a plan when the member chooses Not now', async () => {
    mockAccountFetch(baseAccount());
    renderDetail('/shared-accounts/pot-1?setupPlan=1');

    const setup = await screen.findByTestId('member-contribution-plan-setup');
    fireEvent.click(within(setup).getByRole('radio', { name: /^weekly$/i }));
    fireEvent.click(within(setup).getByRole('button', { name: /not now/i }));

    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /set up your contribution plan/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /^weekly$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });

  it('lets a not-now member open setup later from Shared Account detail', async () => {
    mockAccountFetch(baseAccount());
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: /set up your contribution plan/i }));
    expect(screen.getByRole('radio', { name: /^weekly$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
  });

  it('shows setup for a historical member with no contributionPlans', async () => {
    mockAccountFetch(baseAccount({ contributionPlans: [] }));
    renderDetail();

    expect(await screen.findByTestId('member-contribution-plan-setup')).toBeInTheDocument();
    expect(screen.queryByTestId('member-contribution-plan-summary')).not.toBeInTheDocument();
  });

  it('shows a plan summary instead of setup when the member already agreed', async () => {
    mockAccountFetch(baseAccount({
      contributionPlans: [
        {
          user: owner._id,
          frequency: 'monthly',
          agreed: true,
          status: 'active',
          scheduledAmount: 200,
          nextContributionDate: '2026-09-30'
        },
        {
          user: member._id,
          frequency: 'weekly',
          agreed: true,
          status: 'active',
          scheduledAmount: 50,
          nextContributionDate: '2026-09-14'
        },
        {
          user: memberB._id,
          frequency: 'fortnightly',
          agreed: true,
          status: 'active',
          scheduledAmount: 100,
          nextContributionDate: '2026-09-14'
        }
      ]
    }));
    renderDetail();

    expect(await screen.findByTestId('member-contribution-plan-summary')).toBeInTheDocument();
    expect(screen.getByText(/weekly · £50\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/next: 14 september 2026/i)).toBeInTheDocument();
    expect(screen.queryByTestId('member-contribution-plan-setup')).not.toBeInTheDocument();
    expect(screen.queryByText(/monthly · £200/i)).not.toBeInTheDocument();
  });

  it('keeps the organiser plan independent when a member has a different frequency', async () => {
    authState.user = {
      id: 'user-1',
      name: 'Sam Brown',
      firstName: 'Sam',
      lastName: 'Brown',
      email: 'sam@example.com'
    };
    mockAccountFetch(baseAccount({
      contributionPlans: [
        {
          user: owner._id,
          frequency: 'monthly',
          agreed: true,
          status: 'active',
          scheduledAmount: 200,
          nextContributionDate: '2026-09-30'
        },
        {
          user: member._id,
          frequency: 'weekly',
          agreed: true,
          status: 'active',
          scheduledAmount: 50,
          nextContributionDate: '2026-09-14'
        }
      ]
    }));
    renderDetail();

    expect(await screen.findByTestId('member-contribution-plan-summary')).toBeInTheDocument();
    expect(screen.getByText(/monthly · £200\.00/i)).toBeInTheDocument();
    expect(screen.queryByText(/weekly · £50/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('member-contribution-plan-setup')).not.toBeInTheDocument();
  });
});
