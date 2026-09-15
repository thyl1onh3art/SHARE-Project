import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import SharedAccounts from './SharedAccounts';

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

function mockList(accounts: unknown[]) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('archived=true')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: accounts });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts']}>
      <Routes>
        <Route path="/shared-accounts" element={<SharedAccounts />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccounts list role badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Organiser on a list card the current user owns', async () => {
    mockList([{
      _id: 'pot-canada',
      name: 'Canada Holiday',
      owner: { _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' },
      members: [{ _id: 'user-2' }],
      financeRecords: [],
      targetAmount: 500
    }]);

    renderList();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('shows Shared with you on a list card the current user joined', async () => {
    mockList([{
      _id: 'pot-weekend',
      name: 'Weekend Fund',
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
      members: [{ _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' }],
      financeRecords: [],
      targetAmount: 120
    }]);

    renderList();

    expect(await screen.findByRole('heading', { name: 'Weekend Fund' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('shows Shared with you after ownership is transferred away if the user remains a member', async () => {
    mockList([{
      _id: 'pot-canada',
      name: 'Canada Holiday',
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
      members: [{ _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' }],
      financeRecords: [],
      targetAmount: 500
    }]);

    renderList();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('shows no list badge after ownership is transferred away and the user is no longer a member', async () => {
    mockList([{
      _id: 'pot-canada',
      name: 'Canada Holiday',
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
      members: [],
      financeRecords: [],
      targetAmount: 500
    }]);

    renderList();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });
});
