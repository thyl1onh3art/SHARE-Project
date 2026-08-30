import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Invitations from './Invitations';
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

const pendingInvite = {
  _id: 'inv-1',
  sender: organiser,
  recipientEmail: 'sam@example.com',
  sharedAccount: { _id: 'acc-invite', name: 'Ski trip' },
  status: 'pending',
  expiresAt: '2027-01-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z'
};

const pendingPayment = {
  _id: 'pr-pending',
  status: 'pending',
  amount: 1000,
  description: 'Payee: Example Hotel · Ref: ABC123',
  requiredApprovals: 1,
  requestedBy: organiser,
  approvals: [],
  rejections: [],
  sharedAccount: { _id: 'acc-3', name: 'test 3' }
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
    user: organiser
  },
  {
    _id: 'r2',
    type: 'input',
    amount: 500,
    date: '2026-08-21T00:00:00.000Z',
    user: member
  }
];

function mockGets({
  invites = [pendingInvite],
  payments = [pendingPayment]
}: {
  invites?: unknown[];
  payments?: unknown[];
} = {}) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/invites/list')) {
      return Promise.resolve({ data: invites });
    }
    if (url === '/shared-accounts' || url.startsWith('/shared-accounts?')) {
      return Promise.resolve({ data: [account] });
    }
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

function renderNotifications(initial = '/invitations') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Notifications payment approvals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows a payment-approval notification for the other eligible member and keeps invitations working', async () => {
    mockGets();
    renderNotifications();

    expect(await screen.findByRole('heading', { name: 'Payment approval needed' })).toBeInTheDocument();
    expect(screen.getByText('richard brown wants to pay £1000.00 from “test 3”. Review and approve the payment.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payment approval needed/i })).toHaveAttribute('href', '/shared-accounts/acc-3');
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.getByText('Join Ski trip')).toBeInTheDocument();
  });

  it('does not notify the proposer about their own payment', async () => {
    mockGets({
      invites: [],
      payments: [{ ...pendingPayment, requestedBy: member }]
    });
    renderNotifications();

    await screen.findByRole('heading', { name: 'Notifications' });
    expect(screen.queryByRole('heading', { name: 'Payment approval needed' })).not.toBeInTheDocument();
  });

  it('does not show completed, rejected, or cancelled payments as actionable notifications', async () => {
    mockGets({
      invites: [],
      payments: [
        { ...pendingPayment, _id: 'done', status: 'executed' },
        { ...pendingPayment, _id: 'rej', status: 'rejected' },
        { ...pendingPayment, _id: 'can', status: 'cancelled' }
      ]
    });
    renderNotifications();

    await screen.findByRole('heading', { name: 'Notifications' });
    expect(screen.queryByRole('heading', { name: 'Payment approval needed' })).not.toBeInTheDocument();
  });

  it('does not duplicate the same pending payment on a normal load', async () => {
    mockGets({ invites: [], payments: [pendingPayment, pendingPayment] });
    renderNotifications();

    expect(await screen.findAllByRole('link', { name: /payment approval needed/i })).toHaveLength(1);
  });

  it('opens the Shared Account from the notification and shows Approve payment', async () => {
    mockGets();
    renderNotifications();

    fireEvent.click(await screen.findByRole('link', { name: /payment approval needed/i }));

    expect(await screen.findByText('Payment approval needed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^approve payment$/i })).toBeInTheDocument();
    expect(screen.getByText('test 3')).toBeInTheDocument();
  });

  it('still accepts invitations after payment-approval notifications are present', async () => {
    mockGets();
    renderNotifications();

    fireEvent.click(await screen.findByRole('button', { name: /accept invitation/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/invites/accept', { inviteId: 'inv-1' });
    });
  });
});
