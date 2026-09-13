import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from './ForgotPassword';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const GENERIC =
  'If an account exists for that email address, password reset instructions have been sent.';

function renderForgot() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<div>Sign in page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Forgot password page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates email before requesting a reset', async () => {
    renderForgot();
    const email = screen.getByLabelText(/^email$/i) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.submit(email.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('shows the same generic confirmation for an existing account', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: {
        message: GENERIC,
        developmentResetUrl: 'http://localhost:3000/reset-password/abc'
      }
    });
    renderForgot();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByTestId('forgot-password-confirmation')).toHaveTextContent(GENERIC);
    expect(mockedAxios.post).toHaveBeenCalledWith('/users/forgot-password', { email: 'sam@example.com' });
  });

  it('shows the same generic confirmation for an unknown email', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: { message: GENERIC }
    });
    renderForgot();
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'unknown@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    const confirmation = await screen.findByTestId('forgot-password-confirmation');
    expect(confirmation).toHaveTextContent(GENERIC);
    expect(confirmation).not.toHaveTextContent(/no account/i);
    expect(confirmation).not.toHaveTextContent(/not found/i);
  });
});
