import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SharedAccounts from './SharedAccounts';

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

describe('SharedAccounts trip link create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/events/')) {
        return Promise.resolve({ data: { _id: 'trip-1', title: 'Canada', tripMoney: null } });
      }
      if (url.startsWith('/shared-accounts')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/payment-requests') || url.startsWith('/finance')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('posts eventId when creating Trip Money from a trip', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: { sharedAccount: { _id: 'new-linked-pot', name: 'Canada' } }
    });

    render(
      <MemoryRouter initialEntries={['/shared-accounts?event=trip-1&name=Canada']}>
        <Routes>
          <Route path="/shared-accounts" element={<SharedAccounts />} />
          <Route path="/shared-accounts/:accountId" element={<div>Opened pot</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText(/trip money name/i)).toHaveValue('Canada');
    fireEvent.change(screen.getByLabelText(/what are you collecting for/i), {
      target: { value: 'Flights' }
    });
    fireEvent.change(screen.getByLabelText(/target amount/i), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: /^create trip money$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts',
        expect.objectContaining({
          name: 'Canada',
          description: 'Flights',
          eventId: 'trip-1'
        })
      );
    });
  });

  it('opens existing linked Trip Money instead of creating again', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/events/')) {
        return Promise.resolve({
          data: { _id: 'trip-1', title: 'Canada', tripMoney: { _id: 'existing-pot', name: 'Canada' } }
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <MemoryRouter initialEntries={['/shared-accounts?event=trip-1&name=Canada']}>
        <Routes>
          <Route path="/shared-accounts" element={<SharedAccounts />} />
          <Route path="/shared-accounts/:accountId" element={<div>Opened existing pot</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Opened existing pot')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
