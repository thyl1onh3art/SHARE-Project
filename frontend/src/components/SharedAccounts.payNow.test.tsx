import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';
import SharedAccounts from './SharedAccounts';
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

const fullPot = {
  _id: 'pot-full',
  name: 'task 1 test',
  description: 'Fully funded',
  owner,
  members: [],
  targetAmount: 2000,
  financeRecords: [{ _id: 'r-full', type: 'input', amount: 2000, user: owner }],
  createdAt: '2026-01-01T00:00:00.000Z'
};

const belowPot = {
  _id: 'pot-below',
  name: 'still collecting',
  description: 'Partial',
  owner,
  members: [],
  targetAmount: 2000,
  financeRecords: [{ _id: 'r-below', type: 'input', amount: 500, user: owner }],
  createdAt: '2026-01-01T00:00:00.000Z'
};

const noTargetPot = {
  _id: 'pot-none',
  name: 'no target',
  description: 'Open',
  owner,
  members: [],
  financeRecords: [{ _id: 'r-none', type: 'input', amount: 100, user: owner }],
  createdAt: '2026-01-01T00:00:00.000Z'
};

const archivedPot = {
  _id: 'pot-archived',
  name: 'closed pot',
  description: 'Done',
  owner,
  members: [],
  targetAmount: 2000,
  isDeleted: true,
  financeRecords: [{ _id: 'r-arch', type: 'input', amount: 2000, user: owner }],
  createdAt: '2026-01-01T00:00:00.000Z'
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function mockListFetch(active: unknown[], archived: unknown[] = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts?archived=true')) {
      return Promise.resolve({ data: archived });
    }
    if (url === '/shared-accounts' || url.startsWith('/shared-accounts?')) {
      return Promise.resolve({ data: active });
    }
    if (url.startsWith('/shared-accounts/')) {
      const id = url.split('/')[2];
      const found = [...active, ...archived].find((account: any) => account._id === id);
      return Promise.resolve({ data: found || {} });
    }
    if (url.startsWith('/finance?sharedAccount=')) {
      const id = url.split('=')[1];
      const found: any = [...active, ...archived].find((account: any) => account._id === id);
      return Promise.resolve({ data: found?.financeRecords || [] });
    }
    if (url.startsWith('/payment-requests') || url.startsWith('/finance')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderList(initial = '/shared-accounts') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/shared-accounts" element={<><SharedAccounts /><LocationProbe /></>} />
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccounts list Pay now', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows a green Pay now CTA only on a 100% active pot', async () => {
    mockListFetch([fullPot, belowPot, noTargetPot]);
    renderList();

    expect(await screen.findByText('task 1 test')).toBeInTheDocument();
    const payNow = screen.getByRole('button', { name: /^pay now$/i });
    expect(payNow).toHaveClass('btn-success');
    expect(payNow).not.toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^pay now$/i })).toHaveLength(1);
  });

  it('does not show Pay now on below-target, no-target, or archived pots', async () => {
    mockListFetch([belowPot, noTargetPot], [archivedPot]);
    renderList();

    expect(await screen.findByText('still collecting')).toBeInTheDocument();
    expect(screen.getByText('no target')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show archived trip money/i }));
    expect(await screen.findByText('closed pot')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
  });

  it('opens the Final payment form for the funded pot', async () => {
    mockListFetch([fullPot, belowPot]);
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: /^pay now$/i }));

    expect(await screen.findByRole('heading', { name: 'Final payment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£2000.00');
    expect(screen.getByLabelText(/^supplier$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^reference$/i)).toBeInTheDocument();
    expect(screen.getByText(/prototype: this records the group’s proposed final payment/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Final payment' })).toHaveLength(1);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('hides Pay now after a final payment has been completed', async () => {
    mockListFetch([fullPot]);
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts?archived=true')) {
        return Promise.resolve({ data: [] });
      }
      if (url === '/shared-accounts' || url.startsWith('/shared-accounts?')) {
        return Promise.resolve({ data: [fullPot] });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({
          data: [{
            _id: 'pr-done',
            status: 'executed',
            amount: 2000,
            description: 'Payee: Example Hotel · Ref: ABC123',
            sharedAccount: { _id: 'pot-full', name: 'task 1 test' }
          }]
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderList();

    expect(await screen.findByText('task 1 test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Payment completed')).toBeInTheDocument();
  });

  it('keeps normal card navigation without opening the payment form', async () => {
    mockListFetch([fullPot, belowPot]);
    renderList();

    fireEvent.click(await screen.findByText('still collecting'));

    expect(await screen.findByRole('heading', { name: 'still collecting' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Final payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
  });

  it('opens archived Trip Money from the archived=1 list view', async () => {
    mockListFetch([fullPot], [archivedPot]);
    renderList('/shared-accounts?archived=1');

    expect(await screen.findByText('closed pot')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('task 1 test')).toBeInTheDocument();
    fireEvent.click(screen.getByText('closed pot'));
    expect(await screen.findByRole('heading', { name: /trip money closed/i })).toBeInTheDocument();
    expect(screen.getAllByText(/read-only history/i).length).toBeGreaterThan(0);
  });
});
