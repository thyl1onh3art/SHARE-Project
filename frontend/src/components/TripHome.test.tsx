import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import TripHome from './TripHome';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const renderTripHome = () =>
  render(
    <MemoryRouter initialEntries={['/events/trip-canada']}>
      <Routes>
        <Route path="/events/:eventId" element={<TripHome />} />
      </Routes>
    </MemoryRouter>
  );

const baseTrip = {
  _id: 'trip-canada',
  title: 'Canada',
  eventDate: '2027-01-01',
  eventTime: '10:00',
  user: { _id: 'u1', firstName: 'Sam', lastName: 'Organiser' },
  sharedWith: [{ _id: 'u2', firstName: 'Alex', lastName: 'Friend' }],
  tripMoney: null
};

describe('TripHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Set up Trip Money when a trip has no linked pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: baseTrip });
    renderTripHome();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set up trip money/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/shared-accounts?event=trip-canada')
    );
    expect(screen.queryByLabelText(/trip money summary/i)).not.toBeInTheDocument();
  });

  it('shows the money summary and Open Trip Money for an active pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        ...baseTrip,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: false,
          targetAmount: 2400,
          recordedTotal: 1800,
          yourContribution: 250,
          targetDate: '2026-11-30T00:00:00.000Z'
        }
      }
    });
    renderTripHome();

    expect(await screen.findByText('£1,800 of £2,400 contributed')).toBeInTheDocument();
    expect(screen.getByText('Your contribution: £250')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open trip money/i })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-canada'
    );
    expect(screen.queryByRole('link', { name: /set up trip money/i })).not.toBeInTheDocument();
  });

  it('shows Review Trip Money when the contribution target is reached', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        ...baseTrip,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: false,
          targetAmount: 2400,
          recordedTotal: 2400
        }
      }
    });
    renderTripHome();

    expect(await screen.findByRole('link', { name: /review trip money/i })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-canada'
    );
  });

  it('shows View closed Trip Money for an archived pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        ...baseTrip,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: true,
          targetAmount: 2400,
          recordedTotal: 2400
        }
      }
    });
    renderTripHome();

    expect(await screen.findByText('Trip Money closed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view closed trip money/i })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-canada'
    );
  });

  it('renders a future-date countdown and group members', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: baseTrip });
    renderTripHome();

    expect(await screen.findByText(/\d+ days to go/)).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Organiser')).toBeInTheDocument();
  });
});
