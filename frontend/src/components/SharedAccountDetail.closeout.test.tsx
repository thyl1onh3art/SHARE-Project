import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  firstName: 'Tom',
  lastName: 'Brown',
  email: 'tom@example.com'
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
    if (url.startsWith('/users/')) {
      return Promise.resolve({ data: owner });
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

describe('SharedAccountDetail close-out flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps collection actions when the target is not reached', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 1000,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 400,
          date: '2026-01-02T00:00:00.000Z',
          user: 'user-1',
          description: 'Deposit'
        }
      ]
    );

    renderDetail();

    expect(await screen.findAllByRole('button', { name: /pay account/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /invite traveller/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /review trip close-out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close trip money$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive trip money/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay single payment$/i })).not.toBeInTheDocument();
    expect(screen.getByText('Final payment unlocks at 100%.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pay account$/i })).toHaveClass('btn-primary');
  });

  it('promotes Pay now when the target is reached, not Close Trip Money', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 1000,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 1000,
          date: '2026-01-02T00:00:00.000Z',
          user: 'user-1',
          description: 'Target met'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByRole('button', { name: /^pay now$/i })).toHaveClass('btn-success');
    const payNowButtons = screen.getAllByRole('button', { name: /^pay now$/i });
    expect(payNowButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^close trip money$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review trip close-out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay account$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^invite traveller$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay single payment$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^more$/i }));
    expect(await screen.findByRole('button', { name: /^pay account$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^invite traveller$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^archive trip money$/i }).length).toBeGreaterThan(0);
  });

  it('shows closed read-only copy when archived', async () => {
    mockAccountFetch({
      _id: 'pot-1',
      name: 'Canada',
      description: 'Trip costs',
      owner,
      members: [member],
      financeRecords: [],
      targetAmount: 1000,
      isDeleted: true,
      deletedAt: '2026-08-21T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: /trip money closed/i })).toBeInTheDocument();
    expect(screen.getAllByText(/read-only history/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /pay account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record contribution/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invite traveller/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay single payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request settlement record/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close trip money/i })).not.toBeInTheDocument();
  });

  it('uses simple contribution, traveller, and activity wording', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 1000,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 400,
          date: new Date().toISOString(),
          user: owner,
          description: 'Deposit'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Who has contributed' })).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getAllByText('Contributed').length).toBeGreaterThan(0);
    expect(screen.getByText('Still needed')).toBeInTheDocument();
    expect(screen.getAllByText('Share').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Remaining').length).toBeGreaterThan(0);
    expect(screen.queryByText('Suggested share')).not.toBeInTheDocument();
    expect(screen.queryByText('Remaining (vs share)')).not.toBeInTheDocument();
    expect(screen.queryByText('Recorded total')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent activity' })).toBeInTheDocument();
    expect(screen.getByText('Sam Brown contributed £400.00')).toBeInTheDocument();
    expect(screen.queryByText(/settlement executed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/settlement pending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ledger/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /trip close-out/i })).not.toBeInTheDocument();
  });
});
