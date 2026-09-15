import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Register from './Register';
import Login from './Login';

const mockRegister = jest.fn().mockResolvedValue(undefined);
const mockLogin = jest.fn().mockResolvedValue(undefined);

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: (...args: unknown[]) => mockLogin(...args),
    register: (...args: unknown[]) => mockRegister(...args),
    logout: jest.fn(),
    sendVerificationCode: jest.fn(),
    verifyEmail: jest.fn(),
    updateProfile: jest.fn(),
    refreshUser: jest.fn(),
    deleteAccount: jest.fn()
  })
}));

const token = 'c'.repeat(64);

function fillRegistrationForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alex Friend' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alex@example.com' } });
  fireEvent.click(screen.getByLabelText('21-25'));
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password1' } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password1' } });
}

describe('Register return-to invite', () => {
  beforeEach(() => {
    mockRegister.mockClear();
    mockLogin.mockClear();
  });

  it('keeps the invite returnTo on Login here', () => {
    render(
      <MemoryRouter initialEntries={[`/register?returnTo=/invite/${token}`]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /login here/i })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`
    );
  });

  it('returns to the same invite after registration and sign-in', async () => {
    render(
      <MemoryRouter initialEntries={[`/register?returnTo=/invite/${token}`]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path={`/invite/${token}`} element={<div>Returned to invite</div>} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
    expect(await screen.findByRole('heading', { name: /log in to share/i })).toBeInTheDocument();
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

  it('still goes to Login after registration when there is no invite returnTo', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /login here/i })).toHaveAttribute('href', '/login');

    fillRegistrationForm();
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});
