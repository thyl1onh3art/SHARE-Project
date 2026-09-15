import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';

const mockLogin = jest.fn().mockResolvedValue(undefined);

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: (...args: unknown[]) => mockLogin(...args),
    register: jest.fn(),
    logout: jest.fn(),
    sendVerificationCode: jest.fn(),
    verifyEmail: jest.fn(),
    updateProfile: jest.fn(),
    refreshUser: jest.fn(),
    deleteAccount: jest.fn()
  })
}));

describe('Login return-to invite', () => {
  beforeEach(() => {
    mockLogin.mockClear();
  });

  it('returns to the invite page after sign-in', async () => {
    const token = 'd'.repeat(64);
    render(
      <MemoryRouter initialEntries={[`/login?returnTo=/invite/${token}`]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path={`/invite/${token}`} element={<div>Returned to invite</div>} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /register here/i })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent(`/invite/${token}`)}`
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(await screen.findByText('Returned to invite')).toBeInTheDocument();
  });

  it('returns Home after sign-in when there is no invite returnTo', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /register here/i })).toHaveAttribute('href', '/register');

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });
});
