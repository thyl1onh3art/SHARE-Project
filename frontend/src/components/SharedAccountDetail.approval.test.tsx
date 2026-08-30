import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import SharedAccountDetail from './SharedAccountDetail';

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
    user: { id: 'user-2', name: 'sam brown', firstName: 'sam', lastName: 'brown', email: 'sam@example.com' },
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

const organiser = {
  _id: 'user-1',
  firstName: 'richard',
  lastName: 'brown',
  email: 'richard@example.com'
};

const member = {
  _id: 'user-2',
  firstName: 'sam',
  lastName: 'brown',
  email: 'sam@example.com'
};

const account = {
  _id: 'acc-3',
  name: 'test 3',
  description: 'Trip costs',
  owner: organiser,
  members: [member],
  financeRecords: [],
  targetAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const fundedRecords = [
  {
    _id: 'r1',
    type: 'input',
    amount: 500,
    date: '2026-08-20T00:00:00.000Z',
    user: organiser,
    description: 'Richard share'
  },
  {
    _id: 'r2',
    type: 'input',
    amount: 500,
    date: '2026-08-21T00:00:00.000Z',
    user: member,
    description: 'Sam share'
  }
];

function pendingPayment(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'pr-pending',
    status: 'pending',
    amount: 1000,
    description: 'Payee: Example Hotel · Ref: ABC123',
    requiredApprovals: 1,
    requestedBy: organiser,
    approvals: [],
    rejections: [],
    sharedAccount: 'acc-3',
    ...overrides
  };
}

function mockAccountFetch(payments: Array<Record<string, unknown>>) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
    }
    if (url.startsWith('/finance')) {
      return Promise.resolve({ data: fundedRecords });
    }
    if (url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: payments });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts/acc-3']}>
      <Routes>
        <Route path="/events" element={<div>Shared Accounts home</div>} />
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccountDetail payment approval panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows Approve and Reject for the eligible second member', async () => {
    mockAccountFetch([pendingPayment()]);
    renderDetail();

    expect(await screen.findByText('Payment approval needed')).toBeInTheDocument();
    expect(screen.getByText(/richard brown wants to pay £1000.00 to Example Hotel/)).toBeInTheDocument();
    expect(screen.getAllByText(/Reference:\s*ABC123/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^approve payment$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/unknown user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/507f1f77bcf86cd799439011/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^approve payment$/i }));
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/payment-requests/pr-pending/approve');
    });
  });

  it('omits missing supplier and reference without leaving technical placeholders', async () => {
    mockAccountFetch([pendingPayment({ description: '' })]);
    renderDetail();

    expect(await screen.findByText('Payment approval needed')).toBeInTheDocument();
    expect(screen.getByText('richard brown wants to pay £1000.00')).toBeInTheDocument();
    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/to\s+$/)).not.toBeInTheDocument();
  });

  it('hides Approve after the member has already approved', async () => {
    mockAccountFetch([pendingPayment({
      requiredApprovals: 2,
      approvals: [{ user: member, status: 'approved' }]
    })]);
    renderDetail();

    expect(await screen.findAllByText('Waiting for approval')).not.toHaveLength(0);
    expect(screen.getByText('You have approved this payment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve payment$/i })).not.toBeInTheDocument();
  });

  it('does not expose Approve on completed, rejected, or cancelled requests', async () => {
    mockAccountFetch([{
      ...pendingPayment({ _id: 'pr-done', status: 'executed' }),
      approvals: [{ user: member, status: 'approved' }]
    }]);
    renderDetail();

    expect(await screen.findAllByText('Payment completed')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^approve payment$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment approval needed')).not.toBeInTheDocument();
  });

  it('does not expose Approve after rejection', async () => {
    mockAccountFetch([pendingPayment({
      status: 'rejected',
      rejections: [{ user: member }]
    })]);
    renderDetail();

    expect(await screen.findAllByText('Payment rejected')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^approve payment$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment approval needed')).not.toBeInTheDocument();
  });

  it('does not expose Approve after cancellation', async () => {
    mockAccountFetch([pendingPayment({ status: 'cancelled' })]);
    renderDetail();

    expect(await screen.findAllByText('Payment request cancelled')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^approve payment$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment approval needed')).not.toBeInTheDocument();
  });
});
