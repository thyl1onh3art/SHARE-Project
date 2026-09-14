import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SharedAccountDetail from './SharedAccountDetail';
import { formatHistoryWhen } from '../utils/tripHome';

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

const owner = {
  _id: 'user-1',
  firstName: 'Sam',
  lastName: 'Brown',
  email: 'sam@example.com'
};

const member = {
  _id: 'user-2',
  firstName: 'Richard',
  lastName: 'Brown',
  email: 'richard@example.com'
};

const jo = {
  _id: 'user-3',
  firstName: 'Tom',
  lastName: 'Zero',
  email: 'tom@example.com'
};

function mockAccountFetch(
  account: Record<string, unknown>,
  records: Array<Record<string, unknown>> = [],
  payments: Array<Record<string, unknown>> = []
) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
    }
    if (url.startsWith('/finance')) {
      return Promise.resolve({ data: records });
    }
    if (url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: payments });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts/pot-1']}>
      <Routes>
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

function activityCard() {
  return screen.getByRole('heading', { name: 'Account activity' }).closest('.card') as HTMLElement;
}

describe('SharedAccountDetail Account activity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces the old standalone sections with one Account activity card', async () => {
    mockAccountFetch({
      _id: 'pot-1',
      name: 'Canada',
      owner,
      members: [member, jo],
      financeRecords: [],
      targetAmount: 600,
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Account activity' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Account activity' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Who has contributed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Transaction history' })).not.toBeInTheDocument();
    expect(within(activityCard()).getByRole('heading', { name: 'Contribution summary' })).toBeInTheDocument();
  });

  it('keeps member contribution totals, names, and a £0 member in the summary', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member, jo],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 40,
          date: '2026-08-27T10:00:00.000Z',
          user: owner
        },
        {
          _id: 'r2',
          type: 'input',
          amount: 25,
          date: '2026-08-27T11:00:00.000Z',
          user: member
        }
      ]
    );

    renderDetail();

    const card = (await screen.findByRole('heading', { name: 'Contribution summary' })).closest('.card') as HTMLElement;
    const summary = card.querySelector('#traveller-contributions') as HTMLElement;
    expect(within(summary).getByText('Sam Brown (you)')).toBeInTheDocument();
    expect(within(summary).getByText('Richard Brown')).toBeInTheDocument();
    expect(within(summary).getByText('Tom Zero')).toBeInTheDocument();
    expect(within(summary).getByText('£40.00')).toBeInTheDocument();
    expect(within(summary).getByText('£25.00')).toBeInTheDocument();
    const rows = summary.querySelectorAll('.trip-money-member-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[2] as HTMLElement).getByText('Tom Zero')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('£0.00')).toBeInTheDocument();
  });

  it('keeps oldest-first activity order with dates', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 200,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r-later',
          type: 'input',
          amount: 25,
          date: '2026-08-27T14:00:00.000Z',
          user: member
        },
        {
          _id: 'r-earlier',
          type: 'input',
          amount: 10,
          date: '2026-08-27T09:00:00.000Z',
          user: owner
        }
      ]
    );

    renderDetail();

    const card = (await screen.findByRole('heading', { name: 'Activity' })).closest('.card') as HTMLElement;
    const items = within(card).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Sam Brown');
    expect(items[0]).toHaveTextContent('Contributed £10.00');
    expect(items[0]).toHaveTextContent(formatHistoryWhen('2026-08-27T09:00:00.000Z'));
    expect(items[1]).toHaveTextContent('Richard Brown');
    expect(items[1]).toHaveTextContent('Contributed £25.00');
    expect(items[1]).toHaveTextContent(formatHistoryWhen('2026-08-27T14:00:00.000Z'));
  });

  it('shows a useful empty state for a new Shared Account', async () => {
    mockAccountFetch({
      _id: 'pot-1',
      name: 'Canada',
      owner,
      members: [member],
      financeRecords: [],
      targetAmount: 600,
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    renderDetail();

    const card = (await screen.findByRole('heading', { name: 'Account activity' })).closest('.card') as HTMLElement;
    expect(within(card).getByText('No activity yet.')).toBeInTheDocument();
    expect(within(card).getByText('Contributions and payment activity will appear here.')).toBeInTheDocument();
    expect(within(card).queryByRole('list')).not.toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: 'Contribution summary' })).toBeInTheDocument();
  });

  it('keeps contribution summary and activity on a closed Shared Account', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 200,
        isDeleted: true,
        deletedAt: '2026-08-28T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 200,
          date: '2026-08-27T13:10:00.000Z',
          user: owner
        }
      ],
      [{
        _id: 'pr-1',
        status: 'executed',
        amount: 200,
        description: 'Payee: Test Hotel · Ref: ABC',
        createdAt: '2026-08-27T13:25:00.000Z',
        updatedAt: '2026-08-27T13:35:00.000Z',
        requestedBy: owner,
        approvals: [{ user: member, timestamp: '2026-08-27T13:30:00.000Z' }],
        sharedAccount: 'pot-1'
      }]
    );

    renderDetail();

    expect(await screen.findByRole('heading', { name: /shared account closed/i })).toBeInTheDocument();
    const card = activityCard();
    const summary = card.querySelector('#traveller-contributions') as HTMLElement;
    expect(within(summary).getByText('Sam Brown (you)')).toBeInTheDocument();
    expect(within(summary).getByText('£200.00')).toBeInTheDocument();
    expect(within(card).getByText('Proposed final payment of £200.00 to Test Hotel')).toBeInTheDocument();
    expect(within(card).getByText('Approved final payment')).toBeInTheDocument();
    expect(within(card).getByText('Final payment')).toBeInTheDocument();
    expect(within(card).getByText('£200.00 to Test Hotel')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Who has contributed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Transaction history' })).not.toBeInTheDocument();
  });

  it('shows a contribution reversal in activity when it is not a completed payment', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 200,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r-in',
          type: 'input',
          amount: 40,
          date: '2026-08-27T10:00:00.000Z',
          user: owner
        },
        {
          _id: 'r-out',
          type: 'output',
          amount: 10,
          date: '2026-08-27T12:00:00.000Z',
          user: owner,
          description: 'Correction'
        }
      ]
    );

    renderDetail();

    const card = (await screen.findByRole('heading', { name: 'Activity' })).closest('.card') as HTMLElement;
    expect(within(card).getByText('Contributed £40.00')).toBeInTheDocument();
    expect(within(card).getByText('Reversed contribution £10.00')).toBeInTheDocument();
  });
});
