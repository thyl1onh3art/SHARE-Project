import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import InviteLanding from './InviteLanding';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const token = 'a'.repeat(64);
let mockUser: { id: string; name: string; email: string } | null = null;

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

function OpenedAccount() {
  const [params] = useSearchParams();
  return <div>Opened Shared Account setup={params.get('setupPlan')}</div>;
}

function renderInvite(path = `/invite/${token}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invite/:token" element={<InviteLanding />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/register" element={<div>Register page</div>} />
        <Route path="/shared-accounts/:accountId" element={<OpenedAccount />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Invite landing page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
  });

  it('shows the Shared Account name and sign-in options when logged out', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'pending',
        accountName: 'Holiday fund',
        organiserName: 'Sam Brown',
        targetAmount: 400,
        targetDate: '2027-06-01',
        isOwnInvite: false
      }
    });

    renderInvite();

    expect(await screen.findByText("You've been invited to join:")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Holiday fund' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in to continue' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`
    );
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent(`/invite/${token}`)}`
    );
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
  });

  it('shows Accept and Decline for a signed-in guest', async () => {
    mockUser = { id: 'user-2', name: 'Alex Friend', email: 'alex@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'pending',
        accountName: 'Holiday fund',
        isOwnInvite: false
      }
    });

    renderInvite();

    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('routes accept into the Shared Account setup-plan flow without creating a plan itself', async () => {
    mockUser = { id: 'user-2', name: 'Alex Friend', email: 'alex@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: { state: 'pending', accountName: 'Holiday fund', isOwnInvite: false }
    });
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: { sharedAccount: { _id: 'pot-1' } }
    });

    renderInvite();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));

    expect(mockedAxios.post).toHaveBeenCalledWith(`/invites/link/${token}/accept`);
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringMatching(/contribution-plan/));
    expect(await screen.findByText('Opened Shared Account setup=1')).toBeInTheDocument();
  });

  it('does not grant access after decline', async () => {
    mockUser = { id: 'user-2', name: 'Alex Friend', email: 'alex@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: { state: 'pending', accountName: 'Holiday fund', isOwnInvite: false }
    });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: { message: 'Invitation declined' } });

    renderInvite();
    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }));

    expect(mockedAxios.post).toHaveBeenCalledWith(`/invites/link/${token}/decline`);
    expect(await screen.findByText('This invitation is no longer available.')).toBeInTheDocument();
    expect(screen.queryByText(/Opened Shared Account/)).not.toBeInTheDocument();
  });

  it('renders an invalid invite token cleanly', async () => {
    renderInvite('/invite/not-a-token');
    expect(await screen.findByText('This invitation link is invalid.')).toBeInTheDocument();
  });

  it('renders an expired invite cleanly', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: { state: 'expired', message: 'This invitation has expired.' }
    });
    renderInvite();
    expect(await screen.findByText('This invitation has expired.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
  });

  it('renders a used invite as already accepted while logged out', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'accepted',
        message: 'This invitation has already been accepted.'
      }
    });
    renderInvite();
    expect(await screen.findByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByText('This invitation link is invalid.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Shared Account' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeInTheDocument();
  });

  it('renders a declined invite as unavailable', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'unavailable',
        message: 'This invitation is no longer available.'
      }
    });
    renderInvite();
    expect(await screen.findByText('This invitation is no longer available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
  });

  it('renders a used invite cleanly', async () => {
    mockUser = { id: 'user-2', name: 'Alex Friend', email: 'alex@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'accepted',
        message: 'This invitation has already been accepted.',
        acceptedByCurrentUser: true,
        accountId: 'pot-1'
      }
    });
    renderInvite();
    expect(await screen.findByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Shared Account' })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-1'
    );
    expect(screen.getByRole('link', { name: 'Open Shared Account' })).not.toHaveAttribute(
      'href',
      expect.stringMatching(/setupPlan/)
    );
    expect(screen.getByRole('link', { name: 'Back to Home' })).toBeInTheDocument();
  });

  it('does not show Accept on an accepted invite for a different user', async () => {
    mockUser = { id: 'user-9', name: 'Other Person', email: 'other@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        state: 'accepted',
        message: 'This invitation has already been accepted.',
        acceptedByCurrentUser: false
      }
    });
    renderInvite();
    expect(await screen.findByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept invitation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Shared Account' })).not.toBeInTheDocument();
  });

  it('does not reopen setupPlan when accept is reused', async () => {
    mockUser = { id: 'user-2', name: 'Alex Friend', email: 'alex@example.com' };
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: { state: 'pending', accountName: 'Holiday fund', isOwnInvite: false }
    });
    (mockedAxios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 409,
        data: {
          state: 'accepted',
          message: 'This invitation has already been accepted.',
          accountId: 'pot-1',
          acceptedByCurrentUser: true
        }
      }
    });

    renderInvite();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));

    expect(await screen.findByText('This invitation has already been accepted.')).toBeInTheDocument();
    expect(screen.queryByText(/Opened Shared Account/)).not.toBeInTheDocument();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).not.toHaveBeenCalledWith(expect.stringMatching(/contribution-plan/));
  });
});
