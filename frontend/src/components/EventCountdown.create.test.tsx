import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EventCountdown from './EventCountdown';
import {
  calendarDaysRemaining,
  deadlineStateFromDays,
  formatMoneyAmount,
  recurringAmountForFrequency
} from '../utils/tripHome';

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

function mockEmptyLists() {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('archived=true')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: [] });
    }
    if (typeof url === 'string' && url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderCreatePage() {
  return render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<EventCountdown />} />
        <Route path="/shared-accounts/:accountId" element={<div>Opened Shared Account</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openCreateForm() {
  fireEvent.click(await screen.findByRole('button', { name: /^create shared account$/i }));
  expect(await screen.findByRole('heading', { name: 'Create Shared Account' })).toBeInTheDocument();
}

function fillCoreFields() {
  fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Task 21 create test' } });
  fireEvent.change(screen.getByLabelText(/total goal/i), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText(/^date money is needed/i), { target: { value: '2027-12-01' } });
  fireEvent.change(screen.getByLabelText(/how many people will contribute/i), { target: { value: '2' } });
}

function scheduledLabel(frequency: 'weekly' | 'fortnightly' | 'monthly') {
  const remaining = 50;
  const days = calendarDaysRemaining('2027-12-01');
  const amount = recurringAmountForFrequency(
    remaining,
    days,
    frequency,
    deadlineStateFromDays(days)
  );
  const perLabel = frequency === 'weekly'
    ? 'per week'
    : frequency === 'fortnightly'
      ? 'every 2 weeks'
      : 'per month';
  if (amount == null) {
    throw new Error(`Expected a scheduled amount for ${frequency}`);
  }
  return `Scheduled contribution ${formatMoneyAmount(amount)} ${perLabel}`;
}

describe('EventCountdown Create Shared Account cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyLists();
  });

  it('renders Create Shared Account without Location or Type', async () => {
    renderCreatePage();
    await openCreateForm();

    expect(screen.getByLabelText(/account name/i)).toBeRequired();
    expect(screen.getByLabelText(/total goal/i)).toBeRequired();
    expect(screen.getByLabelText(/^date money is needed/i)).toBeRequired();
    expect(screen.getByLabelText(/how many people will contribute/i)).toBeRequired();
    expect(screen.queryByText(/^Location$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Type$/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/barcelona, the venue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^holiday$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create event/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create event/i })).not.toBeInTheDocument();
  });

  it('creates without location or type and opens the Shared Account', async () => {
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: {
        event: { _id: 'trip-21', title: 'Task 21 create test' },
        sharedAccount: { _id: 'pot-21', name: 'Task 21 create test', targetAmount: 100 }
      }
    });

    renderCreatePage();
    await openCreateForm();
    fillCoreFields();
    fireEvent.click(screen.getByRole('radio', { name: /^weekly$/i }));
    fireEvent.click(screen.getByLabelText(/i agree to this contribution plan/i));
    fireEvent.submit(screen.getByLabelText(/account name/i).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/events/with-trip-money',
        expect.objectContaining({
          title: 'Task 21 create test',
          eventDate: '2027-12-01',
          eventTime: '00:00',
          targetAmount: 100,
          plannedContributors: 2,
          contributionFrequency: 'weekly',
          contributionPlanAgreed: true
        })
      );
    });

    const posted = (mockedAxios.post as jest.Mock).mock.calls[0][1];
    expect(posted).not.toHaveProperty('location');
    expect(posted).not.toHaveProperty('category');
    expect(await screen.findByText('Opened Shared Account')).toBeInTheDocument();
  });

  it('does not post when the contribution plan is not agreed', async () => {
    renderCreatePage();
    await openCreateForm();
    fillCoreFields();
    fireEvent.click(screen.getByRole('radio', { name: /^weekly$/i }));
    fireEvent.submit(screen.getByLabelText(/account name/i).closest('form') as HTMLFormElement);

    expect(await screen.findByText(/please agree to this contribution plan/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('shows weekly, every 2 weeks, and monthly plan previews', async () => {
    renderCreatePage();
    await openCreateForm();
    fillCoreFields();

    expect(screen.getByText('Your planned contribution')).toBeInTheDocument();
    expect(screen.getByText('£50.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /^weekly$/i }));
    expect(screen.getByText(scheduledLabel('weekly'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /every 2 weeks/i }));
    expect(screen.getByText(scheduledLabel('fortnightly'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /^monthly$/i }));
    expect(screen.getByText(scheduledLabel('monthly'))).toBeInTheDocument();
  });

  it('keeps native date-picker behaviour on the create date field', async () => {
    renderCreatePage();
    await openCreateForm();

    const dateInput = screen.getByLabelText(/^date money is needed/i) as HTMLInputElement;
    const showPicker = jest.fn();
    dateInput.showPicker = showPicker;
    fireEvent.click(dateInput);

    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('still shows historical location on an existing Shared Account card', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('archived=true')) {
        return Promise.resolve({ data: [] });
      }
      if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
        return Promise.resolve({ data: [] });
      }
      if (typeof url === 'string' && url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({
        data: [{
          _id: 'trip-legacy',
          title: 'Barcelona',
          eventDate: '2027-09-01',
          eventTime: '00:00',
          location: 'Barcelona',
          category: 'holiday',
          ownedByCurrentUser: true,
          tripMoney: {
            _id: 'pot-legacy',
            name: 'Barcelona',
            isDeleted: false,
            targetAmount: 100,
            recordedTotal: 20,
            yourContribution: 20,
            owner: { _id: 'user-1', firstName: 'Sam', lastName: 'Brown' },
            members: []
          }
        }]
      });
    });

    renderCreatePage();

      const card = (await screen.findByRole('heading', { name: 'Barcelona' })).closest('.trip-list-card') as HTMLElement;
    expect(card.querySelector('.trip-list-location')).toHaveTextContent('Barcelona');
    expect(screen.getByRole('link', { name: 'Open Barcelona' })).toBeInTheDocument();
  });

  it('opens the Create Shared Account form from the Home create query without Location or Type', async () => {
    render(
      <MemoryRouter initialEntries={['/events?create=1']}>
        <Routes>
          <Route path="/events" element={<EventCountdown />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Create Shared Account' })).toBeInTheDocument();
    expect(screen.queryByText(/^Location$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Type$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create event/i })).not.toBeInTheDocument();
  });
});
