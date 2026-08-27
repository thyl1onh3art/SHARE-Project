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

const unresolvedId = '507f1f77bcf86cd799439011';

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

function historyCard() {
  return screen.getByRole('heading', { name: 'Transaction history' }).closest('.card') as HTMLElement;
}

describe('SharedAccountDetail transaction history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows one Transaction history with each contribution once', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 50,
          date: '2026-08-27T13:10:00.000Z',
          user: owner,
          description: 'Sam share'
        },
        {
          _id: 'r2',
          type: 'input',
          amount: 150,
          date: '2026-08-27T13:22:00.000Z',
          user: member,
          description: 'Richard share'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Transaction history' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Transaction history' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Recent activity' })).not.toBeInTheDocument();

    const history = historyCard();
    expect(within(history).getAllByText('Contributed £50.00')).toHaveLength(1);
    expect(within(history).getAllByText('Contributed £150.00')).toHaveLength(1);
    expect(within(history).getByText('Sam Brown')).toBeInTheDocument();
    expect(within(history).getByText('Richard Brown')).toBeInTheDocument();
    expect(within(history).getByText(formatHistoryWhen('2026-08-27T13:10:00.000Z'))).toBeInTheDocument();
    expect(within(history).getByText(formatHistoryWhen('2026-08-27T13:22:00.000Z'))).toBeInTheDocument();
    expect(history.textContent).not.toMatch(/T\d{2}:\d{2}:\d{2}/);
    expect(within(history).queryByText(/FinanceRecord/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/PaymentRequest/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/ledger/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/\binput\b/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/\boutput\b/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/executed/i)).not.toBeInTheDocument();
    expect(within(history).queryByText(/settlement/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
  });

  it('shows final-payment activity with simple wording and no ids', async () => {
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
          _id: 'r1',
          type: 'input',
          amount: 200,
          date: '2026-08-27T13:10:00.000Z',
          user: owner
        },
        {
          _id: unresolvedId,
          type: 'output',
          amount: 200,
          date: '2026-08-27T13:35:00.000Z',
          description: 'Payee: Test Hotel · Ref: ABC',
          user: unresolvedId
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

    const history = (await screen.findByRole('heading', { name: 'Transaction history' })).closest('.card') as HTMLElement;
    expect(within(history).getByText('Proposed final payment of £200.00 to Test Hotel')).toBeInTheDocument();
    expect(within(history).getByText('Approved final payment')).toBeInTheDocument();
    expect(within(history).getByText('Richard Brown')).toBeInTheDocument();
    expect(within(history).getByText('Final payment')).toBeInTheDocument();
    expect(within(history).getByText('£200.00 to Test Hotel')).toBeInTheDocument();
    expect(within(history).queryByText('Reversed contribution £200.00')).not.toBeInTheDocument();
    expect(within(history).queryByText(unresolvedId)).not.toBeInTheDocument();
    expect(within(history).queryByText(/FinanceRecord|PaymentRequest|ledger|executed|settlement/i)).not.toBeInTheDocument();
  });

  it('uses Account activity when a person cannot be resolved', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [{
        _id: 'r-old',
        type: 'input',
        amount: 25,
        date: '2026-08-20T09:00:00.000Z',
        user: unresolvedId
      }]
    );

    renderDetail();

    const history = (await screen.findByRole('heading', { name: 'Transaction history' })).closest('.card') as HTMLElement;
    expect(within(history).getByText('Account activity')).toBeInTheDocument();
    expect(within(history).getByText('Contributed £25.00')).toBeInTheDocument();
    expect(within(history).queryByText(unresolvedId)).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
  });

  it('uses simple wording for payment rejection and cancellation', async () => {
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
      [],
      [
        {
          _id: 'pr-rej',
          status: 'rejected',
          amount: 80,
          description: 'Payee: Cafe · Ref: 1',
          createdAt: '2026-08-27T10:00:00.000Z',
          requestedBy: owner,
          rejections: [{ user: member, timestamp: '2026-08-27T10:05:00.000Z' }],
          sharedAccount: 'pot-1'
        },
        {
          _id: 'pr-can',
          status: 'cancelled',
          amount: 80,
          description: 'Payee: Cafe · Ref: 1',
          createdAt: '2026-08-27T11:00:00.000Z',
          updatedAt: '2026-08-27T11:08:00.000Z',
          requestedBy: owner,
          sharedAccount: 'pot-1'
        }
      ]
    );

    renderDetail();

    const history = (await screen.findByRole('heading', { name: 'Transaction history' })).closest('.card') as HTMLElement;
    expect(within(history).getByText('Rejected final payment')).toBeInTheDocument();
    expect(within(history).getByText('Cancelled final payment')).toBeInTheDocument();
    expect(within(history).queryByText(/PaymentRequest/i)).not.toBeInTheDocument();
  });
});
