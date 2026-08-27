import React from 'react';
import { render, screen } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 'user-1', name: 'Sam Brown', email: 'sam@example.com' },
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

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

describe('removed travel-planning routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('unread-count')) {
        return Promise.resolve({ data: { count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
  });

  it.each(['/gallery', '/map', '/accommodations'])(
    'redirects %s to Shared Accounts without rendering the old page',
    async (path) => {
      renderAt(path);

      expect(await screen.findByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Photos' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Map' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Places to stay' })).not.toBeInTheDocument();
      expect(screen.queryByText(/google maps/i)).not.toBeInTheDocument();
    }
  );

  it('still opens Home', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('still opens Shared Accounts', async () => {
    renderAt('/events');
    expect(await screen.findByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
  });

  it('still opens Notifications', async () => {
    renderAt('/invitations');
    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
  });
});
