import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import PersonalFinance from './PersonalFinance';
import { formatLocalYmd } from '../utils/tripHome';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
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

describe('PersonalFinance contribution plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.put as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows an agreed plan separately from suggested guidance on historical accounts', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));

    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/shared-accounts')) {
        return Promise.resolve({
          data: [
            {
              _id: 'pot-holiday',
              name: 'Holiday Fund',
              targetAmount: 1200,
              targetDate: futureDate,
              plannedContributors: 4,
              owner,
              members: [member],
              contributionPlans: [
                { user: 'user-1', frequency: 'weekly', agreed: true, agreedAt: '2026-08-01T00:00:00.000Z' }
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
                { user: 'user-1', frequency: 'monthly', agreed: true }
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
          ]
        });
      }
      return Promise.resolve({ data: [] });
    });

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
    expect(holiday).toHaveTextContent('Your contribution plan Weekly');
    expect(holiday).toHaveTextContent('Suggested next recurring amount');
    expect(holiday).toHaveTextContent('Change contribution plan');
    expect(holiday).not.toHaveTextContent('Suggested contribution plan');

    const ski = screen.getByRole('heading', { name: 'Ski pot' }).closest('.personal-savings-plan') as HTMLElement;
    expect(ski).toHaveTextContent('Your planned contribution is covered');
    expect(ski).toHaveTextContent('£0.00');
    expect(ski).not.toHaveTextContent('Suggested next recurring amount');

    const cabin = screen.getByRole('heading', { name: 'Cabin fund' }).closest('.personal-savings-plan') as HTMLElement;
    expect(cabin).toHaveTextContent('Suggested contribution plan');
    expect(cabin).toHaveTextContent('Weekly');
    expect(cabin).toHaveTextContent('Every 2 weeks');
    expect(cabin).toHaveTextContent('Monthly');
    expect(cabin).not.toHaveTextContent('Your contribution plan Weekly');
  });

  it('saves a frequency change for the logged-in user only', async () => {
    const now = new Date();
    const futureDate = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 70));

    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/finance')) return Promise.resolve({ data: [] });
      if (url.startsWith('/shared-accounts')) {
        return Promise.resolve({
          data: [{
            _id: 'pot-holiday',
            name: 'Holiday Fund',
            targetAmount: 1200,
            targetDate: futureDate,
            plannedContributors: 4,
            owner,
            members: [member],
            contributionPlans: [
              { user: 'user-1', frequency: 'weekly', agreed: true },
              { user: 'user-2', frequency: 'monthly', agreed: true }
            ],
            financeRecords: []
          }]
        });
      }
      return Promise.resolve({ data: [] });
    });

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
});
