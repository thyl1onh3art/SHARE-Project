import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import axios from 'axios';
import ResetPassword, { ResetPasswordComplete } from './ResetPassword';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const VALID_TOKEN = 'a'.repeat(64);

function renderReset(token = VALID_TOKEN, prefixEntries: string[] = []) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>Sign in page</div> },
      { path: '/forgot-password', element: <div>Forgot password page</div> },
      { path: '/reset-password/complete', element: <ResetPasswordComplete /> },
      { path: '/reset-password/:token', element: <ResetPassword /> }
    ],
    { initialEntries: [...prefixEntries, `/reset-password/${token}`] }
  );
  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Reset password page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the new password form for a valid token', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: { valid: true } });
    renderReset();

    expect(await screen.findByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('blocks a password confirmation mismatch', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: { valid: true } });
    renderReset();
    await screen.findByRole('heading', { name: /choose a new password/i });

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'OtherPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('replaces the token URL after a successful reset and keeps success copy token-free', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: { valid: true } });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: { message: 'Password updated' } });
    const { router } = renderReset(VALID_TOKEN, ['/login']);
    await screen.findByRole('heading', { name: /choose a new password/i });

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByTestId('reset-password-success')).toHaveTextContent('Password updated');
    expect(screen.getByText(/your password has been changed successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/reset-password/complete');
    expect(router.state.location.pathname).not.toContain(VALID_TOKEN);
    expect(JSON.stringify(router.state.location)).not.toContain(VALID_TOKEN);
    expect(screen.queryByText(VALID_TOKEN)).not.toBeInTheDocument();
    expect(mockedAxios.get).toHaveBeenCalledWith(`/users/reset-password/${VALID_TOKEN}`);
    expect(mockedAxios.get).not.toHaveBeenCalledWith('/users/reset-password/complete');

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
  });

  it('shows the invalid token state and a request-new-link action', async () => {
    (mockedAxios.get as jest.Mock).mockRejectedValue({
      response: { data: { message: 'This password reset link is invalid or has expired.' } }
    });
    renderReset('not-a-valid-token');

    expect(await screen.findByTestId('reset-password-invalid')).toHaveTextContent(
      'This password reset link is invalid or has expired.'
    );
    fireEvent.click(screen.getByRole('link', { name: /request a new reset link/i }));
    expect(screen.getByText('Forgot password page')).toBeInTheDocument();
  });
});
