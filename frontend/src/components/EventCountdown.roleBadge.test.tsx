import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EventCountdown from './EventCountdown';

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

function mockOverview(pots: unknown[] = [], events: unknown[] = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('archived=true')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: pots });
    }
    if (typeof url === 'string' && url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.startsWith('/finance')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: events });
  });
}

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<EventCountdown />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Shared Accounts overview role badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Organiser on an account the current user owns', async () => {
    mockOverview([{
      _id: 'pot-canada',
      name: 'Canada Holiday',
      targetAmount: 500,
      owner: { _id: 'user-1', firstName: 'Sam' },
      members: [{ _id: 'user-2' }],
      financeRecords: []
    }]);

    renderOverview();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('shows Shared with you on an account the current user joined', async () => {
    mockOverview([{
      _id: 'pot-weekend',
      name: 'Weekend Fund',
      targetAmount: 120,
      owner: { _id: 'user-2', firstName: 'Alex' },
      members: [{ _id: 'user-1', firstName: 'Sam' }],
      financeRecords: []
    }]);

    renderOverview();

    expect(await screen.findByRole('heading', { name: 'Weekend Fund' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('does not invent a badge for unlinked legacy accounts without owner or members', async () => {
    mockOverview([{
      _id: 'legacy-1',
      name: 'Old hotel pot',
      targetAmount: 400
    }]);

    renderOverview();

    expect(await screen.findByRole('heading', { name: 'Old hotel pot' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('shows Shared with you after ownership is transferred away even if the event summary is stale', async () => {
    mockOverview(
      [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner: { _id: 'user-2', firstName: 'Alex' },
        members: [{ _id: 'user-1', firstName: 'Sam' }],
        financeRecords: []
      }],
      [{
        title: 'Canada Holiday',
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada Holiday',
          owner: { _id: 'user-1', firstName: 'Sam' },
          members: [{ _id: 'user-2', firstName: 'Alex' }]
        }
      }]
    );

    renderOverview();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });
});
