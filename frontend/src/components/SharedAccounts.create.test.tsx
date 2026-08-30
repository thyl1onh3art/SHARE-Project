import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SharedAccounts from './SharedAccounts';
import { startOfLocalCalendarDayIso } from '../utils/tripHome';

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

describe('SharedAccounts create Trip Money', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('opens create flow and posts a new Trip Money pot', async () => {
    const createdId = 'new-pot-id';
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: {
        sharedAccount: {
          _id: createdId,
          name: 'Canada',
          description: 'Flights and cabin',
          targetAmount: 2000
        }
      }
    });

    render(
      <MemoryRouter initialEntries={['/shared-accounts']}>
        <Routes>
          <Route path="/shared-accounts" element={<SharedAccounts />} />
          <Route path="/shared-accounts/:accountId" element={<div>Trip Money detail {createdId}</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /set up shared account/i }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /set up shared account/i })[0]);

    expect(await screen.findByRole('heading', { name: /set up shared account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/how many people will contribute/i)).toBeInTheDocument();
    expect(screen.getByText('Include yourself.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Canada' } });
    fireEvent.change(screen.getByLabelText(/what are you collecting for/i), {
      target: { value: 'Flights and cabin' }
    });
    fireEvent.change(screen.getByLabelText(/total goal/i), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText(/how many people will contribute/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('radio', { name: /^weekly$/i }));
    fireEvent.click(screen.getByLabelText(/i agree to this contribution plan/i));

    fireEvent.click(screen.getByRole('button', { name: /^create shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/shared-accounts',
        expect.objectContaining({
          name: 'Canada',
          description: 'Flights and cabin',
          targetAmount: 2000,
          targetDate: startOfLocalCalendarDayIso('2026-09-10'),
          plannedContributors: 4,
          contributionFrequency: 'weekly',
          contributionPlanAgreed: true
        })
      );
    });

    expect(await screen.findByText(`Trip Money detail ${createdId}`)).toBeInTheDocument();
  });
});
