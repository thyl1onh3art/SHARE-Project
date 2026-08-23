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

function mockAccountFetch(account: Record<string, unknown>, records: Array<Record<string, unknown>> = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
    }
    if (url.startsWith('/finance')) {
      return Promise.resolve({ data: records });
    }
    if (url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
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

describe('SharedAccountDetail Pay single payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('keeps Pay single payment unavailable below target', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 500,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Partial'
    }]);

    renderDetail();

    const button = await screen.findByRole('button', { name: /^pay single payment$/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('btn-danger');
    expect(button.closest('.pay-single-payment-control')).toHaveAttribute('data-state', 'incomplete');
    expect(screen.getByText('Target not reached')).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole('heading', { name: 'Pay single payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('enables Pay single payment with ready-state styling when the target is reached', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 2000,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Target met'
    }]);

    renderDetail();

    const buttons = await screen.findAllByRole('button', { name: /^pay single payment$/i });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('btn-success');
      expect(button.closest('.pay-single-payment-control')).toHaveAttribute('data-state', 'ready');
    });
    expect(screen.getAllByText('Ready to pay').length).toBeGreaterThan(0);

    const payNowButtons = screen.getAllByRole('button', { name: /^pay now$/i });
    expect(payNowButtons.length).toBeGreaterThan(0);
    payNowButtons.forEach((button) => {
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('btn-success');
    });
  });

  it('opens the Pay single payment form from Pay now without executing a payment', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 2000,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Target met'
    }]);

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay now$/i }))[0]);

    expect(await screen.findByRole('heading', { name: 'Pay single payment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£2000.00');
    expect(screen.getByText(/prototype: this records the group’s proposed final payment/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('opens the existing form when arriving with pay=now', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 2000,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Target met'
    }]);

    render(
      <MemoryRouter initialEntries={['/shared-accounts/pot-1?pay=now']}>
        <Routes>
          <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Pay single payment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£2000.00');
    expect(screen.getAllByRole('heading', { name: 'Pay single payment' })).toHaveLength(1);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('opens a full-target payment request without a personal tracked total', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 2000,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Target met'
    }]);

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay single payment$/i }))[0]);

    expect(await screen.findByRole('heading', { name: 'Pay single payment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£2000.00');
    expect(screen.getByText(/prototype: this records the group’s proposed final payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/personal tracked total/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/supplier \/ payee/i), { target: { value: 'Hotel North' } });
    fireEvent.change(screen.getByLabelText(/^reference$/i), { target: { value: 'INV-22' } });
    fireEvent.submit(screen.getByLabelText(/supplier \/ payee/i).closest('form') as HTMLFormElement);

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
    expect(mockedAxios.get).not.toHaveBeenCalledWith('/finance');
  });

  it('keeps the amount fixed at the target when recorded total is above target', async () => {
    mockAccountFetch(baseAccount, [{
      _id: 'r1',
      type: 'input',
      amount: 2100,
      date: '2026-08-23T00:00:00.000Z',
      user: owner,
      description: 'Over target'
    }]);

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay single payment$/i }))[0]);
    expect(await screen.findByLabelText(/^amount$/i)).toHaveValue('£2000.00');

    fireEvent.change(screen.getByLabelText(/supplier \/ payee/i), { target: { value: 'Airline' } });
    fireEvent.change(screen.getByLabelText(/^amount$/i), { target: { value: '500' } });
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£2000.00');

    fireEvent.submit(screen.getByLabelText(/supplier \/ payee/i).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/payment-requests',
        expect.objectContaining({ amount: 2000, payee: 'Airline' })
      );
    });
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      '/payment-requests',
      expect.objectContaining({ amount: 500 })
    );
    expect(mockedAxios.post).not.toHaveBeenCalledWith(
      '/payment-requests',
      expect.objectContaining({ amount: 2100 })
    );
  });

  it('hides Pay single payment on archived Trip Money', async () => {
    mockAccountFetch({
      ...baseAccount,
      isDeleted: true,
      deletedAt: '2026-08-21T00:00:00.000Z'
    }, [{
      _id: 'r1',
      type: 'input',
      amount: 2000,
      date: '2026-08-20T00:00:00.000Z',
      user: owner
    }]);

    renderDetail();

    expect(await screen.findByRole('heading', { name: /trip money closed/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay single payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
  });
});
