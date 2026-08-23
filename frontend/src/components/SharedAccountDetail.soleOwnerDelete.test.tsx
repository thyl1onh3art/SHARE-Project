import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
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
  name: 'Accidental Canada',
  description: 'Created by mistake',
  owner,
  members: [],
  financeRecords: [],
  targetAmount: 1000,
  createdAt: '2026-01-01T00:00:00.000Z'
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
    if (url.startsWith('/invites')) {
      return Promise.resolve({
        data: [{
          _id: 'invite-1',
          status: 'pending',
          recipientEmail: 'pending@example.com',
          sharedAccount: 'pot-1'
        }]
      });
    }
    return Promise.resolve({ data: [] });
  });
}

function TripMoneyList() {
  const [params] = useSearchParams();
  return <div>Trip Money list archived={params.get('archived') || '0'}</div>;
}

function renderDetail(initial = '/shared-accounts/pot-1') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/events" element={<div>Shared Accounts home</div>} />
        <Route path="/shared-accounts" element={<TripMoneyList />} />
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openHeaderRemoveModal(label: RegExp) {
  fireEvent.click(await screen.findByRole('button', { name: label }));
}

describe('SharedAccountDetail sole-owner accidental delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
    (mockedAxios.delete as jest.Mock).mockResolvedValue({ data: { isDeleted: true } });
  });

  it('lets a sole owner delete without transferring ownership', async () => {
    mockAccountFetch(soleAccount);

    renderDetail();
    await openHeaderRemoveModal(/^delete shared account$/i);

    const dialog = (await screen.findByRole('heading', { name: 'Delete Shared Account?' })).closest('.card') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-1');
    });
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/transfer-ownership'),
      expect.anything()
    );
    expect(mockedAxios.delete).not.toHaveBeenCalledWith('/shared-accounts/pot-1/permanent');
    expect(await screen.findByText('Shared Accounts home')).toBeInTheDocument();
  });

  it('does not show a transfer-ownership requirement for a sole owner', async () => {
    mockAccountFetch(soleAccount);

    renderDetail();
    await openHeaderRemoveModal(/^delete shared account$/i);

    expect(await screen.findByRole('heading', { name: 'Delete Shared Account?' })).toBeInTheDocument();
    expect(screen.getByText(/you.?re the only member in this shared account/i)).toBeInTheDocument();
    expect(screen.getByText(/archived shared accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transfer ownership/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you need at least one member/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/new organiser/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('does not require transfer when only a pending invite exists', async () => {
    mockAccountFetch({
      ...soleAccount,
      members: []
    });

    renderDetail();
    await openHeaderRemoveModal(/^delete shared account$/i);

    expect(await screen.findByRole('heading', { name: 'Delete Shared Account?' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new organiser/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pending@example.com/i)).not.toBeInTheDocument();

    const dialog = screen.getByRole('heading', { name: 'Delete Shared Account?' }).closest('.card') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-1');
    });
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/transfer-ownership'),
      expect.anything()
    );
  });

  it('keeps the transfer safeguard when a second traveller has accepted', async () => {
    mockAccountFetch({
      ...soleAccount,
      members: [member]
    });

    renderDetail();
    await openHeaderRemoveModal(/^leave shared account$/i);

    expect(await screen.findByRole('heading', { name: 'Leave Shared Account' })).toBeInTheDocument();
    expect(screen.getByText(/select a member to transfer organiser rights/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new organiser/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /alex friend/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    expect(await screen.findAllByText(/select a member to become organiser/i)).not.toHaveLength(0);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedAxios.delete).not.toHaveBeenCalled();
  });

  it('still counts an accepted traveller with £0 contributed as another traveller', async () => {
    mockAccountFetch({
      ...soleAccount,
      members: [member]
    }, []);

    renderDetail();
    await openHeaderRemoveModal(/^leave shared account$/i);

    expect(await screen.findByRole('heading', { name: 'Leave Shared Account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/new organiser/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delete Shared Account?' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
  });

  it('does not change Close Trip Money archive after payment completion', async () => {
    mockAccountFetch({
      ...soleAccount,
      members: [member],
      targetAmount: 2000
    }, [
      {
        _id: 'r1',
        type: 'input',
        amount: 2000,
        date: '2026-08-20T00:00:00.000Z',
        user: owner,
        description: 'Funded'
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

    expect(await screen.findAllByText('Payment completed')).not.toHaveLength(0);
    const closeButtons = screen.getAllByRole('button', { name: /^close shared account$/i });
    expect(closeButtons[0]).toHaveClass('btn-primary');

    fireEvent.click(closeButtons[0]);
    const closeDialog = (await screen.findByRole('heading', { name: 'Close Shared Account?' })).closest('.card') as HTMLElement;
    fireEvent.click(within(closeDialog).getByRole('button', { name: /^close shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-1');
    });
    expect(mockedAxios.delete).not.toHaveBeenCalledWith('/shared-accounts/pot-1/permanent');
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/transfer-ownership'),
      expect.anything()
    );
    expect(await screen.findByText('Shared Accounts home')).toBeInTheDocument();
  });

  it('does not use permanent delete for an active sole-owner pot', async () => {
    mockAccountFetch(soleAccount);

    renderDetail();
    await openHeaderRemoveModal(/^delete shared account$/i);

    const dialog = (await screen.findByRole('heading', { name: 'Delete Shared Account?' })).closest('.card') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-1');
    });
    expect(mockedAxios.delete).not.toHaveBeenCalledWith(expect.stringMatching(/\/permanent$/));
    expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
  });
});
