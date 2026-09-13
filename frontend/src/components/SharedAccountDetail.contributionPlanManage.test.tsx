import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import SharedAccountDetail from './SharedAccountDetail';
import { formatMoneyAmount, previewAgreedScheduledAmount } from '../utils/tripHome';

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

function memberPlan(overrides: Record<string, unknown> = {}) {
  return {
    user: member._id,
    frequency: 'monthly',
    agreed: true,
    agreedAt: '2026-08-31T12:00:00.000Z',
    status: 'active',
    scheduledAmount: 37.5,
    nextContributionDate: '2026-10-12',
    ...overrides
  };
}

function baseAccount(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _id: 'pot-1',
    name: 'Canada',
    description: 'Group pot',
    owner,
    members: [member],
    financeRecords: [],
    targetAmount: 300,
    plannedContributors: 2,
    targetDate: '2026-10-25',
    contributionPlans: [
      {
        user: owner._id,
        frequency: 'weekly',
        agreed: true,
        status: 'active',
        scheduledAmount: 25,
        nextContributionDate: '2026-09-20'
      },
      memberPlan()
    ],
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

function updateMemberPlan(account: Record<string, unknown>, patch: Record<string, unknown>) {
  account.contributionPlans = (account.contributionPlans as Array<Record<string, unknown>>).map((plan) => (
    String(plan.user) === member._id ? { ...plan, ...patch } : plan
  ));
}

describe('SharedAccountDetail contribution plan management', () => {
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

  it('shows active-plan management controls with cadence, amount, and next date', async () => {
    mockAccountFetch(baseAccount());
    renderDetail();

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    expect(summary).toHaveTextContent('Automatic contribution plan');
    expect(summary).toHaveTextContent('Monthly · £37.50');
    expect(summary).toHaveTextContent('Next: 12 October 2026');
    expect(within(summary).getByRole('button', { name: /change frequency/i })).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: /pause automatic contributions/i })).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: /cancel plan/i })).toBeInTheDocument();
    expect(screen.queryByTestId('member-contribution-plan-setup')).not.toBeInTheDocument();
  });

  it('previews a frequency change and does not persist until confirmation', async () => {
    const records = [{
      _id: 'r1',
      type: 'input',
      amount: 10,
      user: member,
      date: '2026-09-01T12:00:00.000Z'
    }];
    mockAccountFetch(baseAccount(), records);
    renderDetail();

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    fireEvent.click(within(summary).getByRole('button', { name: /change frequency/i }));
    fireEvent.click(within(summary).getByRole('radio', { name: /every 2 weeks/i }));

    expect(mockedAxios.put).not.toHaveBeenCalled();
    const preview = previewAgreedScheduledAmount(140, '2026-10-25', 'fortnightly');
    expect(within(summary).getByText(/change contribution frequency/i)).toBeInTheDocument();
    expect(summary).toHaveTextContent('Current: Monthly · £37.50');
    expect(summary).toHaveTextContent(`New: Every 2 weeks · ${formatMoneyAmount(preview || 0)}`);
    expect(summary).toHaveTextContent('Previous contributions will not change.');

    fireEvent.click(within(summary).getByRole('button', { name: /^cancel$/i }));
    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(within(summary).queryByRole('radio', { name: /every 2 weeks/i })).not.toBeInTheDocument();
    expect(summary).toHaveTextContent('Monthly · £37.50');
  });

  it('confirms a frequency change and leaves previous contributions unchanged', async () => {
    const account = baseAccount();
    const records = [{
      _id: 'r1',
      type: 'input',
      amount: 10,
      user: member,
      date: '2026-09-01T12:00:00.000Z'
    }];
    mockAccountFetch(account, records);
    const preview = previewAgreedScheduledAmount(140, '2026-10-25', 'fortnightly') || 17.5;
    (mockedAxios.put as jest.Mock).mockImplementation(async (url: string, body?: { frequency?: string }) => {
      if (url.endsWith('/contribution-plan') && body?.frequency) {
        updateMemberPlan(account, {
          frequency: body.frequency,
          scheduledAmount: preview,
          nextContributionDate: '2026-09-27'
        });
      }
      return { data: account };
    });

    renderDetail();

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    fireEvent.click(within(summary).getByRole('button', { name: /change frequency/i }));
    fireEvent.click(within(summary).getByRole('radio', { name: /every 2 weeks/i }));
    fireEvent.click(within(summary).getByRole('button', { name: /confirm change/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/shared-accounts/pot-1/contribution-plan',
        { frequency: 'fortnightly' }
      );
    });

    expect(await screen.findByText(/every 2 weeks · £/i)).toBeInTheDocument();
    expect(screen.getByText(/next: 27 september 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Contributed £10.00')).toBeInTheDocument();
    expect(mockedAxios.put).toHaveBeenCalledTimes(1);
  });

  it('pauses an active plan and keeps Pay account available', async () => {
    const account = baseAccount();
    mockAccountFetch(account);
    (mockedAxios.put as jest.Mock).mockImplementation(async (url: string) => {
      if (url.endsWith('/pause')) updateMemberPlan(account, { status: 'paused' });
      return { data: account };
    });

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: /pause automatic contributions/i }));
    expect(mockedAxios.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /^keep plan$/i }));
    expect(mockedAxios.put).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /pause automatic contributions/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /pause automatic contributions/i })[0]);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-1/contribution-plan/pause');
    });

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    expect(summary).toHaveTextContent('Contribution plan paused');
    expect(summary).toHaveTextContent('No automatic contributions will be made while paused.');
    expect(summary).toHaveTextContent('Monthly · £37.50');
    expect(within(summary).getByRole('button', { name: /resume automatic contributions/i })).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: /change frequency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });

  it('resumes a paused plan back to active', async () => {
    const account = baseAccount({
      contributionPlans: [
        memberPlan({ status: 'paused' })
      ]
    });
    mockAccountFetch(account);
    (mockedAxios.put as jest.Mock).mockImplementation(async (url: string) => {
      if (url.endsWith('/resume')) {
        updateMemberPlan(account, { status: 'active', nextContributionDate: '2026-09-20' });
      }
      return { data: account };
    });

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: /resume automatic contributions/i }));
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-1/contribution-plan/resume');
    });
    expect(await screen.findByText('Automatic contribution plan')).toBeInTheDocument();
    expect(screen.getByText(/next: 20 september 2026/i)).toBeInTheDocument();
  });

  it('requires confirmation before cancelling and then shows cancelled state', async () => {
    const account = baseAccount();
    mockAccountFetch(account);
    (mockedAxios.put as jest.Mock).mockImplementation(async (url: string) => {
      if (url.endsWith('/cancel')) updateMemberPlan(account, { status: 'cancelled' });
      return { data: account };
    });

    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: /^cancel plan$/i }));
    expect(screen.getByText('Cancel contribution plan?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^keep plan$/i }));
    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(screen.queryByText('Cancel contribution plan?')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel plan$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel plan$/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-1/contribution-plan/cancel');
    });

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    expect(summary).toHaveTextContent('Contribution plan cancelled');
    expect(summary).toHaveTextContent('Future automatic contributions are stopped.');
    expect(summary).toHaveTextContent('Previous contributions remain in your account history.');
    expect(summary).not.toHaveTextContent('Automatic contribution plan');
    expect(within(summary).getByRole('button', { name: /set up a new contribution plan/i })).toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /change frequency/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /pause automatic contributions/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });

  it('shows a completed plan without management controls', async () => {
    mockAccountFetch(baseAccount({
      contributionPlans: [
        memberPlan({ status: 'completed', scheduledAmount: 37.5 })
      ]
    }), [{
      _id: 'r1',
      type: 'input',
      amount: 150,
      user: member,
      date: '2026-09-01T12:00:00.000Z'
    }]);
    renderDetail();

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    expect(summary).toHaveTextContent('Contribution plan completed');
    expect(summary).toHaveTextContent('Your planned contribution has been completed.');
    expect(within(summary).queryByRole('button', { name: /change frequency/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /pause automatic contributions/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /resume automatic contributions/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /cancel plan/i })).not.toBeInTheDocument();
    expect(within(summary).queryByRole('button', { name: /set up a new contribution plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });

  it('lets a cancelled member set up a new plan from remaining without rewriting history', async () => {
    const account = baseAccount({
      contributionPlans: [
        {
          user: owner._id,
          frequency: 'weekly',
          agreed: true,
          status: 'active',
          scheduledAmount: 25,
          nextContributionDate: '2026-09-20'
        },
        memberPlan({ status: 'cancelled', frequency: 'monthly', scheduledAmount: 37.5 })
      ]
    });
    const records = [{
      _id: 'r1',
      type: 'input',
      amount: 40,
      user: member,
      date: '2026-09-01T12:00:00.000Z'
    }];
    mockAccountFetch(account, records);
    const preview = previewAgreedScheduledAmount(110, '2026-10-25', 'fortnightly') || 0;
    (mockedAxios.put as jest.Mock).mockImplementation(async (url: string, body?: { frequency?: string; agreed?: boolean }) => {
      if (url.endsWith('/contribution-plan') && body?.frequency && body.agreed) {
        updateMemberPlan(account, {
          frequency: body.frequency,
          agreed: true,
          status: 'active',
          scheduledAmount: preview,
          nextContributionDate: '2026-09-27',
          cancelledAt: undefined
        });
      }
      return { data: account };
    });

    renderDetail();

    const summary = await screen.findByTestId('member-contribution-plan-summary');
    expect(summary).toHaveTextContent('Contribution plan cancelled');
    fireEvent.click(within(summary).getByRole('button', { name: /set up a new contribution plan/i }));

    expect(mockedAxios.put).not.toHaveBeenCalled();
    const setup = await screen.findByTestId('member-contribution-plan-new-setup');
    expect(within(setup).getByText(/your planned contribution/i)).toBeInTheDocument();
    expect(setup).toHaveTextContent('£150.00');
    expect(setup).toHaveTextContent('Contributed so far £40.00');
    expect(setup).toHaveTextContent('remaining £110.00');

    fireEvent.click(within(setup).getByRole('radio', { name: /every 2 weeks/i }));
    expect(within(setup).getByRole('button', { name: /save contribution plan/i })).toBeDisabled();
    expect(setup).toHaveTextContent(`Scheduled contribution ${formatMoneyAmount(preview)} every 2 weeks`);

    fireEvent.click(within(setup).getByLabelText(/i agree to this contribution plan/i));
    fireEvent.click(within(setup).getByRole('button', { name: /save contribution plan/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/shared-accounts/pot-1/contribution-plan',
        { frequency: 'fortnightly', agreed: true }
      );
    });

    const active = await screen.findByTestId('member-contribution-plan-summary');
    expect(active).toHaveTextContent('Automatic contribution plan');
    expect(active).toHaveTextContent(`Every 2 weeks · ${formatMoneyAmount(preview)}`);
    expect(active).toHaveTextContent('Next: 27 September 2026');
    expect(active).not.toHaveTextContent('Contribution plan cancelled');
    expect(screen.getByText('Contributed £40.00')).toBeInTheDocument();
    expect(screen.queryByText(/weekly · £25/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
  });
});
