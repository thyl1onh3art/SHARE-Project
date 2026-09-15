import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

function mockDetail(account: Record<string, unknown>) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
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

describe('Shared Account detail role badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Organiser next to the title for the account owner', async () => {
    mockDetail({
      _id: 'pot-1',
      name: 'Canada Holiday',
      owner: { _id: 'user-1', firstName: 'Sam', lastName: 'Brown' },
      members: [{ _id: 'user-2', firstName: 'Alex', lastName: 'Friend' }],
      financeRecords: [],
      contributionPlans: [],
      targetAmount: 500
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('shows Shared with you next to the title for an accepted member', async () => {
    mockDetail({
      _id: 'pot-1',
      name: 'Weekend Fund',
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend' },
      members: [{ _id: 'user-1', firstName: 'Sam', lastName: 'Brown' }],
      financeRecords: [],
      contributionPlans: [],
      targetAmount: 120
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Weekend Fund' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('does not invent a title badge when ownership cannot be determined', async () => {
    mockDetail({
      _id: 'pot-1',
      name: 'Legacy hotel pot',
      members: [],
      financeRecords: [],
      contributionPlans: []
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Legacy hotel pot' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('updates the title badge after organiser role is transferred and the previous owner stays a member', async () => {
    const original = {
      _id: 'pot-1',
      name: 'Canada Holiday',
      owner: { _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' },
      members: [{ _id: 'user-2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' }],
      financeRecords: [],
      contributionPlans: [],
      targetAmount: 500
    };
    const transferred = {
      ...original,
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
      members: [{ _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' }]
    };
    let account = original;

    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts/')) {
        return Promise.resolve({ data: account });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    (mockedAxios.post as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/transfer-ownership')) {
        account = transferred;
        return Promise.resolve({
          data: { message: 'Organiser role transferred successfully', account: transferred }
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderDetail();

    expect(await screen.findByRole('status', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Transfer organiser role' }));
    fireEvent.change(screen.getByLabelText('Make organiser'), { target: { value: 'user-2' } });
    const confirmTransfer = screen.getAllByRole('button', { name: 'Transfer organiser role' }).at(-1);
    fireEvent.click(confirmTransfer as HTMLElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts/pot-1/transfer-ownership',
        { newOwnerId: 'user-2', removeCurrentOwner: false }
      );
    });

    expect(await screen.findByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('shows no title badge after the previous owner leaves during transfer', async () => {
    mockDetail({
      _id: 'pot-1',
      name: 'Canada Holiday',
      owner: { _id: 'user-2', firstName: 'Alex', lastName: 'Friend' },
      members: [],
      financeRecords: [],
      contributionPlans: [],
      targetAmount: 500
    });

    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });
});
