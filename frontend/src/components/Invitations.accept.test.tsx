import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Invitations from './Invitations';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-2', name: 'Alex Friend', firstName: 'Alex', lastName: 'Friend', email: 'alex@example.com' },
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

describe('Invitations accept flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/invites/list')) {
        return Promise.resolve({
          data: [{
            _id: 'inv-1',
            sender: { _id: 'user-1', firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' },
            recipientEmail: 'alex@example.com',
            sharedAccount: { _id: 'pot-1', name: 'Canada' },
            status: 'pending',
            expiresAt: '2027-01-01T00:00:00.000Z',
            createdAt: '2026-08-01T00:00:00.000Z'
          }]
        });
      }
      if (url.startsWith('/shared-accounts')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('keeps /invitations and shows invitation actions under Notifications', async () => {
    render(
      <MemoryRouter initialEntries={['/invitations']}>
        <Routes>
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/shared-accounts/:accountId" element={<div>Opened pot pot-1</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Shared Account invitations and updates')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Invitations' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /accept invitation/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/invites/accept', { inviteId: 'inv-1' });
    });
    expect(await screen.findByText('Opened pot pot-1')).toBeInTheDocument();
  });
});
