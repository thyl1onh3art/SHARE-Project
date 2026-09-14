import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
  firstName: 'Alex',
  lastName: 'Friend',
  email: 'alex@example.com'
};

const soleAccount = {
  _id: 'pot-1',
  name: 'Canada',
  description: 'Trip costs',
  owner,
  members: [],
  plannedContributors: 4,
  financeRecords: [],
  targetAmount: 100,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const fundedRecords = [{
  _id: 'r1',
  type: 'input',
  amount: 100,
  date: '2026-09-14T10:00:00.000Z',
  user: owner,
  description: 'Funded'
}];

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts/pot-1']}>
      <Routes>
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccountDetail sole-owner final payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Pay now on a fully funded sole-owner account and completes without waiting or self-approval', async () => {
    let payments: Array<Record<string, unknown>> = [];

    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts/')) {
        return Promise.resolve({ data: soleAccount });
      }
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: fundedRecords });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: payments });
      }
      return Promise.resolve({ data: [] });
    });

    (mockedAxios.post as jest.Mock).mockImplementation(async (url: string, body: Record<string, unknown>) => {
      if (url === '/payment-requests') {
        const created = {
          _id: 'pr-solo',
          status: 'executed',
          amount: body.amount,
          description: `Payee: ${body.payee} · Ref: ${body.reference}`,
          requestedBy: owner,
          approvals: [],
          requiredApprovals: 0,
          createdAt: '2026-09-14T12:00:00.000Z',
          updatedAt: '2026-09-14T12:00:01.000Z',
          sharedAccount: 'pot-1'
        };
        payments = [created];
        return {
          data: {
            message: 'Payment completed. SHARE does not send bank payments.',
            paymentRequest: created
          }
        };
      }
      return { data: {} };
    });

    renderDetail();

    const payNow = await screen.findAllByRole('button', { name: /^pay now$/i });
    expect(payNow.length).toBeGreaterThan(0);
    fireEvent.click(payNow[0]);

    fireEvent.change(await screen.findByLabelText(/^supplier$/i), { target: { value: 'Hotel Solo' } });
    fireEvent.change(screen.getByLabelText(/^reference$/i), { target: { value: 'SOLO-1' } });
    fireEvent.submit(screen.getByLabelText(/^supplier$/i).closest('form') as HTMLFormElement);

    expect(await screen.findByText('Payment completed. No money was transferred.')).toBeInTheDocument();
    expect(screen.getAllByText('Payment completed').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^close shared account$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment approval needed')).not.toBeInTheDocument();
    expect(screen.queryByText('Approved final payment')).not.toBeInTheDocument();
    expect(screen.queryByText(/sam brown approved/i)).not.toBeInTheDocument();

    const activity = screen.getByRole('heading', { name: 'Account activity' }).closest('.card') as HTMLElement;
    expect(within(activity).getByText('Proposed final payment of £100.00 to Hotel Solo')).toBeInTheDocument();
    expect(within(activity).getByText('Final payment')).toBeInTheDocument();
    expect(within(activity).getByText('£100.00 to Hotel Solo')).toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/payment-requests',
      expect.objectContaining({
        sharedAccountId: 'pot-1',
        amount: 100,
        payee: 'Hotel Solo',
        reference: 'SOLO-1'
      })
    );
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringMatching(/\/approve$/));
  });

  it('still uses the sole-owner path when there is only a pending invite', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts/')) {
        return Promise.resolve({ data: { ...soleAccount, plannedContributors: 4 } });
      }
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: fundedRecords });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderDetail();

    expect((await screen.findAllByRole('button', { name: /^pay now$/i })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Waiting for approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment approval needed')).not.toBeInTheDocument();
  });

  it('keeps the multi-member waiting-for-approval UI once a second member has accepted', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts/')) {
        return Promise.resolve({ data: { ...soleAccount, members: [member] } });
      }
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: fundedRecords });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: [{
          _id: 'pr-pending',
          status: 'pending',
          amount: 100,
          description: 'Payee: Hotel Group · Ref: G1',
          requestedBy: owner,
          approvals: [],
          requiredApprovals: 1,
          createdAt: '2026-09-14T12:00:00.000Z',
          sharedAccount: 'pot-1'
        }] });
      }
      return Promise.resolve({ data: [] });
    });

    renderDetail();

    expect((await screen.findAllByText('Waiting for approval')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Approved final payment')).not.toBeInTheDocument();
  });
});
