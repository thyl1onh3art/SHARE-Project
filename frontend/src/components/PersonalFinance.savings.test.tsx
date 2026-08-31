import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import PersonalFinance from './PersonalFinance';
import { formatLocalYmd } from '../utils/tripHome';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Sam Brown', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' },
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

const owner = { _id: 'user-1', firstName: 'Sam', lastName: 'Brown' };
const member = { _id: 'user-2', firstName: 'Alex', lastName: 'Friend' };

function mockGets(accounts: unknown[], processDueEnabled = false) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/finance')) return Promise.resolve({ data: [] });
    if (url.includes('automatic-contributions')) {
      return Promise.resolve({ data: { processDueEnabled } });
    }
    if (url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: accounts });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('PersonalFinance contribution plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.put as jest.Mock).mockResolvedValue({ data: {} });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: { processed: 0, results: [] } });
  });

  it('shows an agreed plan separately from suggested guidance on historical accounts', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));

    mockGets([
      {
        _id: 'pot-holiday',
        name: 'Holiday Fund',
        targetAmount: 1200,
        targetDate: futureDate,
        plannedContributors: 4,
        owner,
        members: [member],
        contributionPlans: [
          {
            user: 'user-1',
            frequency: 'weekly',
            agreed: true,
            agreedAt: '2026-08-23T00:00:00.000Z',
            status: 'active',
            nextContributionDate: '2026-09-06'
          }
        ],
        financeRecords: [
          { _id: 'r1', type: 'input', amount: 100, user: owner }
        ]
      },
      {
        _id: 'pot-ski',
        name: 'Ski pot',
        targetAmount: 800,
        targetDate: futureDate,
        plannedContributors: 2,
        owner,
        members: [member],
        contributionPlans: [
          { user: 'user-1', frequency: 'monthly', agreed: true, status: 'completed' }
        ],
        financeRecords: [
          { _id: 'r2', type: 'input', amount: 400, user: owner }
        ]
      },
      {
        _id: 'pot-cabin',
        name: 'Cabin fund',
        targetAmount: 400,
        targetDate: futureDate,
        owner,
        members: [member],
        financeRecords: []
      },
      {
        _id: 'pot-closed',
        name: 'Closed trip',
        targetAmount: 900,
        plannedContributors: 3,
        isDeleted: true,
        owner,
        members: [],
        financeRecords: []
      }
    ]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Your contribution plans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Holiday Fund' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ski pot' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cabin fund' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Closed trip' })).not.toBeInTheDocument();

    const holiday = screen.getByRole('heading', { name: 'Holiday Fund' }).closest('.personal-savings-plan') as HTMLElement;
    expect(holiday).toHaveTextContent('Your planned contribution');
    expect(holiday).toHaveTextContent('£300.00');
    expect(holiday).toHaveTextContent('Contributed');
    expect(holiday).toHaveTextContent('£100.00');
    expect(holiday).toHaveTextContent('Remaining');
    expect(holiday).toHaveTextContent('£200.00');
    expect(holiday).toHaveTextContent('Automatic contribution plan');
    expect(holiday).toHaveTextContent('Active');
    expect(holiday).toHaveTextContent('Next automatic contribution');
    expect(holiday).toHaveTextContent('Due');
    expect(holiday).toHaveTextContent('6 September 2026');
    expect(holiday).toHaveTextContent('Change frequency');
    expect(holiday).toHaveTextContent('Pause');
    expect(holiday).toHaveTextContent('Cancel automatic contributions');
    expect(holiday).toHaveTextContent('Prototype automatic payments — no real money is moved.');
    expect(holiday).not.toHaveTextContent('Suggested contribution plan');
    expect(holiday).not.toHaveTextContent('Start time');

    expect(screen.queryByRole('button', { name: 'Process due automatic contributions' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Process as date')).not.toBeInTheDocument();
    expect(screen.queryByText(/Development only/i)).not.toBeInTheDocument();

    const ski = screen.getByRole('heading', { name: 'Ski pot' }).closest('.personal-savings-plan') as HTMLElement;
    expect(ski).toHaveTextContent('Contribution plan completed');
    expect(ski).toHaveTextContent('Your planned contribution is covered.');
    expect(ski).toHaveTextContent('£0.00');
    expect(ski).not.toHaveTextContent('Next automatic contribution');

    const cabin = screen.getByRole('heading', { name: 'Cabin fund' }).closest('.personal-savings-plan') as HTMLElement;
    expect(cabin).toHaveTextContent('Suggested contribution plan');
    expect(cabin).toHaveTextContent('Weekly');
    expect(cabin).toHaveTextContent('Every 2 weeks');
    expect(cabin).toHaveTextContent('Monthly');
    expect(cabin).not.toHaveTextContent('Automatic contribution plan');
  });

  it('saves a frequency change for the logged-in user only', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));

    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 1200,
      targetDate: futureDate,
      plannedContributors: 4,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'active', nextContributionDate: '2026-09-06' },
        { user: 'user-2', frequency: 'monthly', agreed: true, status: 'active', nextContributionDate: '2026-09-30' }
      ],
      financeRecords: []
    }]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('radio', { name: /every 2 weeks/i }));
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/shared-accounts/pot-holiday/contribution-plan',
        { frequency: 'fortnightly' }
      );
    });
  });

  it('pauses the logged-in user plan', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: futureDate,
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'active', nextContributionDate: '2026-09-06' }
      ],
      financeRecords: []
    }]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-holiday/contribution-plan/pause');
    });
  });

  it('shows resume for a paused plan', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: futureDate,
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'paused', nextContributionDate: '2026-09-06' }
      ],
      financeRecords: []
    }]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    const paused = (await screen.findByRole('heading', { name: 'Holiday Fund' })).closest('.personal-savings-plan') as HTMLElement;
    expect(paused).toHaveTextContent('Paused');
    expect(paused).toHaveTextContent('No automatic contributions will be recorded while paused.');
    fireEvent.click(screen.getByRole('button', { name: 'Resume automatic contributions' }));
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-holiday/contribution-plan/resume');
    });
  });

  it('asks for confirmation before cancelling an automatic plan', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: futureDate,
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'active', nextContributionDate: '2026-09-06' }
      ],
      financeRecords: []
    }]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel automatic contributions' }));
    expect(screen.getByText('Cancel automatic contribution plan?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep plan' }));
    expect(screen.queryByText('Cancel automatic contribution plan?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel automatic contributions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel plan' }));
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith('/shared-accounts/pot-holiday/contribution-plan/cancel');
    });
  });

  it('shows cancelled status without pretending the plan was completed', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: futureDate,
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'cancelled', nextContributionDate: '2026-09-06' }
      ],
      financeRecords: []
    }]);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    const holiday = (await screen.findByRole('heading', { name: 'Holiday Fund' })).closest('.personal-savings-plan') as HTMLElement;
    expect(holiday).toHaveTextContent('Automatic contribution plan cancelled');
    expect(holiday).toHaveTextContent('No future automatic contributions are scheduled.');
    expect(holiday).not.toHaveTextContent('Contribution plan completed');
    expect(holiday).not.toHaveTextContent('Next automatic contribution');
  });

  it('does not change a Weekly plan when processing due contributions that are not due', async () => {
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: '2026-10-27',
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        {
          user: 'user-1',
          frequency: 'weekly',
          agreed: true,
          agreedAt: '2026-08-24T00:00:00.000Z',
          status: 'active',
          nextContributionDate: '2026-09-07'
        }
      ],
      financeRecords: []
    }], true);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    const holiday = (await screen.findByRole('heading', { name: 'Holiday Fund' })).closest('.personal-savings-plan') as HTMLElement;
    expect(within(holiday).getByRole('radio', { name: 'Weekly' })).toBeChecked();
    expect(within(holiday).getByRole('radio', { name: 'Monthly' })).not.toBeChecked();
    expect(holiday).toHaveTextContent('7 September 2026');
    const amountBefore = holiday.textContent;

    fireEvent.click(screen.getByRole('button', { name: 'Process due automatic contributions' }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts/automatic-contributions/process',
        { now: formatLocalYmd(new Date()) }
      );
    });

    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading personal tracked activity...')).not.toBeInTheDocument();
    expect(within(holiday).getByRole('radio', { name: 'Weekly' })).toBeChecked();
    expect(within(holiday).getByRole('radio', { name: 'Monthly' })).not.toBeChecked();
    expect(holiday).toHaveTextContent('7 September 2026');
    expect(holiday).toHaveTextContent('Weekly');
    expect(holiday.textContent).toBe(amountBefore);
  });

  it('shows the development-only process action when the API allows it', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: futureDate,
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        { user: 'user-1', frequency: 'weekly', agreed: true, status: 'active', nextContributionDate: '2026-09-06' }
      ],
      financeRecords: []
    }], true);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Process due automatic contributions' }));
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts/automatic-contributions/process',
        { now: formatLocalYmd(new Date()) }
      );
    });
    expect(screen.getByLabelText('Process as date')).toBeInTheDocument();
  });

  it('sends the selected Process as date when processing due contributions', async () => {
    mockGets([{
      _id: 'pot-holiday',
      name: 'Holiday Fund',
      targetAmount: 200,
      targetDate: '2026-10-27',
      plannedContributors: 2,
      owner,
      members: [member],
      contributionPlans: [
        {
          user: 'user-1',
          frequency: 'weekly',
          agreed: true,
          status: 'active',
          nextContributionDate: '2026-09-07'
        }
      ],
      financeRecords: []
    }], true);

    render(
      <MemoryRouter>
        <PersonalFinance />
      </MemoryRouter>
    );

    const dateInput = await screen.findByLabelText('Process as date');
    fireEvent.change(dateInput, { target: { value: '2026-09-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Process due automatic contributions' }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts/automatic-contributions/process',
        { now: '2026-09-07' }
      );
    });
    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(screen.queryByText('Loading personal tracked activity...')).not.toBeInTheDocument();
  });
});
