import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const baseAccount = {
  _id: 'pot-1',
  name: 'Canada',
  description: 'Trip costs',
  owner,
  members: [member],
  financeRecords: [],
  targetAmount: 2000,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const fundedRecords = [
  {
    _id: 'r1',
    type: 'input',
    amount: 1000,
    date: '2026-08-20T00:00:00.000Z',
    user: owner,
    description: 'Sam share'
  },
  {
    _id: 'r2',
    type: 'input',
    amount: 1000,
    date: '2026-08-21T00:00:00.000Z',
    user: member,
    description: 'Alex share'
  }
];

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

function renderDetail(initial = '/shared-accounts/pot-1') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/shared-accounts" element={<div>Trip Money list</div>} />
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccountDetail payment completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('keeps contribution progress at the target after payment completion', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByRole('progressbar', { name: 'Contribution progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getAllByText('Contributed').some((el) => el.closest('div')?.textContent?.includes('£2000.00'))).toBe(true);
    expect(screen.getAllByText('£2000.00').length).toBeGreaterThan(0);
    expect(screen.getByText(/your remaining/i).closest('p')).toHaveTextContent('£0.00');
    expect(screen.getAllByText('£1000.00').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay single payment$/i })).not.toBeInTheDocument();
  });

  it('shows completed payment history and Close Trip Money as the next action', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByText('Example Hotel')).toBeInTheDocument();
    expect(screen.getByText(/reference:\s*ABC123/i)).toBeInTheDocument();
    expect(screen.getAllByText('Payment completed').length).toBeGreaterThan(0);
    expect(screen.getByText(/proposed by sam brown/i)).toBeInTheDocument();
    expect(screen.getByText('Prototype payment record — no real money was transferred.')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: /^close trip money$/i });
    expect(closeButtons[0]).toHaveClass('btn-primary');
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
  });

  it('opens a close confirmation and Keep open cancels it', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^close trip money$/i }))[0]);
    expect(await screen.findByRole('heading', { name: 'Close Trip Money?' })).toBeInTheDocument();
    expect(screen.getByText(/move it to your archived trip money/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no money is moved by this action/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^keep open$/i }));
    expect(screen.queryByRole('heading', { name: 'Close Trip Money?' })).not.toBeInTheDocument();
    expect(mockedAxios.delete).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: /^close trip money$/i }).length).toBeGreaterThan(0);
  });

  it('archives on Close Trip Money and returns to the list', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);
    (mockedAxios.delete as jest.Mock).mockResolvedValue({ data: { isDeleted: true } });

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^close trip money$/i }))[0]);
    const dialog = (await screen.findByRole('heading', { name: 'Close Trip Money?' })).closest('.card') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /^close trip money$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-1');
    });
    expect(await screen.findByText('Trip Money list')).toBeInTheDocument();
  });

  it('keeps contribution and payment history readable after close', async () => {
    mockAccountFetch({
      ...baseAccount,
      isDeleted: true,
      deletedAt: '2026-08-23T00:00:00.000Z'
    }, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByRole('heading', { name: /trip money closed/i })).toBeInTheDocument();
    expect(screen.getAllByText(/read-only history/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar', { name: 'Contribution progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getAllByText('Contributed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£2000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Example Hotel')).toBeInTheDocument();
    expect(screen.getByText(/reference:\s*ABC123/i)).toBeInTheDocument();
    expect(screen.getAllByText('Payment completed').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay account$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close trip money$/i })).not.toBeInTheDocument();
  });

  it('shows approval progress and actions for a required member', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-pending',
      status: 'pending',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: member,
      approvals: [],
      rejections: [],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findAllByText('Waiting for approval')).not.toHaveLength(0);
    expect(screen.getByText(/approvals:\s*1 of 2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^approve payment$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject payment$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close trip money$/i })).not.toBeInTheDocument();
  });

  it('lets the proposer cancel a pending payment request', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-pending',
      status: 'pending',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [],
      rejections: [],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByRole('button', { name: /^cancel payment request$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^approve payment$/i })).not.toBeInTheDocument();
  });

  it('shows a rejected payment without reopening Pay now', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-rejected',
      status: 'rejected',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [],
      rejections: [{ user: member }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByText('Payment rejected')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^pay now$/i }).length).toBeGreaterThan(0);
  });

  it('does not open the payment form from pay=now after completion', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    render(
      <MemoryRouter initialEntries={['/shared-accounts/pot-1?pay=now']}>
        <Routes>
          <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Example Hotel')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^amount$/i)).not.toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('ignores a legacy matching output when showing funding progress', async () => {
    mockAccountFetch(baseAccount, [
      ...fundedRecords,
      {
        _id: 'r-out',
        type: 'output',
        amount: 2000,
        date: '2026-08-22T00:00:00.000Z',
        user: owner,
        description: 'Payee: Example Hotel · Ref: ABC123'
      }
    ], [{
      _id: 'pr-1',
      status: 'executed',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: owner,
      approvals: [{ user: member, status: 'approved' }],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByRole('progressbar', { name: 'Contribution progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getAllByText('£2000.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contributed').length).toBeGreaterThan(0);
  });
});
