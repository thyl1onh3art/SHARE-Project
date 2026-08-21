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

    expect(await screen.findAllByRole('button', { name: /record contribution/i })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /invite traveller/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /review trip close-out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close trip money$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archive trip money/i })).toBeInTheDocument();
  });

  it('promotes review and close when the target is reached', async () => {
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

    expect(await screen.findByRole('status')).toHaveTextContent(/contribution target reached/i);
    expect(screen.getByRole('button', { name: /review trip close-out/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^close trip money$/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^record contribution$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^invite traveller$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    expect(await screen.findByRole('button', { name: /^record contribution$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^invite traveller$/i })).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: /this trip money is closed/i })).toBeInTheDocument();
    expect(screen.getByText(/new contributions, invitations and settlement requests cannot be added/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record contribution/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /invite traveller/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request settlement record/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close trip money/i })).not.toBeInTheDocument();
  });
});
