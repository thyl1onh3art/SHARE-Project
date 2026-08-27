import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import EventCountdown from './EventCountdown';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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

function mockListGets(events: unknown[] = [], pots: unknown[] = [], archived: unknown[] = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.includes('archived=true')) {
      return Promise.resolve({ data: archived });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: pots });
    }
    return Promise.resolve({ data: events });
  });
}

describe('EventCountdown Shared Accounts page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Shared Accounts and Create Shared Account without Your balance', async () => {
    mockListGets([]);

    render(
      <MemoryRouter>
        <EventCountdown />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Shared Accounts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^create shared account$/i })).toBeInTheDocument();
    expect(screen.queryByText('Your balance')).not.toBeInTheDocument();
    expect(screen.queryByText('Prototype balance — no real money is held.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
  });
});
