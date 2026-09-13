import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ResetPassword from './ResetPassword';

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

function renderReset(token = VALID_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<div>Forgot password page</div>} />
        <Route path="/login" element={<div>Sign in page</div>} />
      </Routes>
    </MemoryRouter>
  );
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

  it('shows success and a back to sign in action after a valid reset', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: { valid: true } });
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: { message: 'Password updated' } });
    renderReset();
    await screen.findByRole('heading', { name: /choose a new password/i });

    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(await screen.findByTestId('reset-password-success')).toHaveTextContent('Password updated');
    expect(screen.getByText(/your password has been changed successfully/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /back to sign in/i }));
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
