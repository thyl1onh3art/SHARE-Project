import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('SharedAccountDetail equal share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows equal share and your remaining from pot members only', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 2400,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 250,
          date: '2026-01-02T00:00:00.000Z',
          user: 'user-1',
          description: 'First share'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByText(/^Each person: £1200.00$/)).toBeInTheDocument();
    expect(screen.getByText(/your contribution:/i)).toHaveTextContent('£250.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£950.00');
    expect(screen.getByText('Equal split is a guide. Contributions can be different.')).toBeInTheDocument();
  });

  it('does not invent remaining when there is no contribution target', async () => {
    mockAccountFetch({
      _id: 'pot-1',
      name: 'Canada',
      description: 'Trip costs',
      owner,
      members: [member],
      financeRecords: [],
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    renderDetail();

    expect(await screen.findByText(/no target set/i)).toBeInTheDocument();
    expect(screen.queryByText(/your remaining:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/equal share:/i)).not.toBeInTheDocument();
  });
});
