import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import ForgotPassword from './ForgotPassword';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<div>Register page</div>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Login forgot password link', () => {
  it('shows Forgot password? near the password field', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /log in to share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password\?/i })).toBeInTheDocument();
  });

  it('navigates to the forgot password page', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('link', { name: /forgot password\?/i }));
    expect(screen.getByRole('heading', { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('still offers Register here', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('link', { name: /register here/i }));
    expect(screen.getByText('Register page')).toBeInTheDocument();
  });
});
