import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const fundedRecords = [{
  _id: 'r1',
  type: 'input',
  amount: 2000,
  date: '2026-08-23T00:00:00.000Z',
  user: owner,
  description: 'Target met'
}];

describe('SharedAccountDetail prototype payment methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('does not show payment methods on a partially funded account', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 500,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Partial'
    }]);

    renderDetail();

    expect(await screen.findByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pay with' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Apple Pay' })).not.toBeInTheDocument();
  });

  it('shows prototype payment methods beside Pay now when the account is ready to pay', async () => {
    mockAccountFetch(baseAccount, fundedRecords);

    renderDetail();

    expect(await screen.findByRole('button', { name: /^pay now$/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pay with' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Apple Pay' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Debit / credit card' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Google Pay' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'PayPal' })).not.toBeChecked();
    expect(screen.getByText('Prototype payment option — no real money is processed.')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Organiser' })).toBeInTheDocument();
  });

  it('lets the user choose another method without calling the payment API', async () => {
    mockAccountFetch(baseAccount, fundedRecords);

    renderDetail();

    fireEvent.click(await screen.findByRole('radio', { name: 'Apple Pay' }));
    expect(screen.getByRole('radio', { name: 'Apple Pay' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Debit / credit card' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'Google Pay' }));
    expect(screen.getByRole('radio', { name: 'Google Pay' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Apple Pay' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: 'PayPal' }));
    expect(screen.getByRole('radio', { name: 'PayPal' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Google Pay' })).not.toBeChecked();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('still opens the existing final-payment form from Pay now', async () => {
    mockAccountFetch(baseAccount, fundedRecords);

    renderDetail();

    fireEvent.click(await screen.findByRole('radio', { name: 'PayPal' }));
    fireEvent.click(screen.getByRole('button', { name: /^pay now$/i }));

    expect(await screen.findByRole('heading', { name: 'Final payment' })).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^supplier$/i), { target: { value: 'Hotel North' } });
    fireEvent.change(screen.getByLabelText(/^reference$/i), { target: { value: 'INV-22' } });
    fireEvent.submit(screen.getByLabelText(/^supplier$/i).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/payment-requests',
        expect.objectContaining({
          sharedAccountId: 'pot-1',
          amount: 2000,
          payee: 'Hotel North',
          reference: 'INV-22'
        })
      );
    });
    expect(mockedAxios.post.mock.calls[0][1]).not.toHaveProperty('paymentMethod');
    expect(mockedAxios.post.mock.calls[0][1]).not.toHaveProperty('applePay');
  });

  it('hides payment methods while a final payment is pending approval', async () => {
    mockAccountFetch(baseAccount, fundedRecords, [{
      _id: 'pr-1',
      status: 'pending',
      amount: 2000,
      description: 'Payee: Example Hotel · Ref: ABC123',
      requiredApprovals: 1,
      requestedBy: member,
      approvals: [],
      sharedAccount: 'pot-1'
    }]);

    renderDetail();

    expect(await screen.findByText('Payment approval needed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pay with' })).not.toBeInTheDocument();
  });

  it('does not show selectable payment methods after payment is completed', async () => {
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

    expect(await screen.findAllByText('Payment completed')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pay with' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'PayPal' })).not.toBeInTheDocument();
  });

  it('does not show payment methods when the Shared Account is closed', async () => {
    mockAccountFetch({
      ...baseAccount,
      isDeleted: true,
      deletedAt: '2026-08-21T00:00:00.000Z'
    }, fundedRecords);

    renderDetail();

    expect(await screen.findByRole('heading', { name: /shared account closed/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pay with' })).not.toBeInTheDocument();
  });
});
