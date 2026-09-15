import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

let mockUser: { id: string; name: string; email: string } | null = {
  id: 'user-1',
  name: 'Sam Brown',
  email: 'sam@example.com'
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: mockUser ? 'test-token' : null,
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
const inviteToken = 'b'.repeat(64);

describe('Navbar primary entry point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user-1', name: 'Sam Brown', email: 'sam@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: { count: 0 } });
  });

  it('uses the SHARE logo as Home and does not show a Home nav item', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: 'SHARE — Home' });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink).toHaveClass('share-nav-brand');
    expect(screen.getByRole('link', { name: 'Shared Accounts' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/invitations');
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trips' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trip Money' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Invitations' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByRole('link', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Photos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Map' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Places to stay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Accommodation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Accommodations' })).not.toBeInTheDocument();
  });

  it('returns to Home when the SHARE logo is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/events']}>
        <Navbar />
        <Routes>
          <Route path="/" element={<div>Home screen</div>} />
          <Route path="/events" element={<div>Shared Accounts screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Shared Accounts screen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'SHARE — Home' }));
    expect(screen.getByText('Home screen')).toBeInTheDocument();
    expect(screen.queryByText('Shared Accounts screen')).not.toBeInTheDocument();
  });

  it('shows payment-approval counts on Notifications as well as Shared Accounts', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/payment-requests/unread-count')) {
        return Promise.resolve({ data: { count: 2 } });
      }
      if (url.includes('/invites/unread-count')) {
        return Promise.resolve({ data: { count: 1 } });
      }
      return Promise.resolve({ data: { count: 0 } });
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    expect(await screen.findAllByLabelText('2 payment requests awaiting your review')).not.toHaveLength(0);
    expect(screen.getByLabelText('1 unread invitations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
  });
});

describe('Navbar auth links on invite pages', () => {
  beforeEach(() => {
    mockUser = null;
  });

  it('adds returnTo to Login and Register while on an invite link', () => {
    render(
      <MemoryRouter initialEntries={[`/invite/${inviteToken}`]}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent(`/invite/${inviteToken}`)}`
    );
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent(`/invite/${inviteToken}`)}`
    );
  });

  it('leaves Login and Register unchanged outside invite pages', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Navbar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
  });
});
