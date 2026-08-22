import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import EventCountdown from './EventCountdown';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseTrip = {
  _id: 'trip-canada',
  title: 'Canada',
  description: 'Group holiday',
  eventDate: '2027-01-01',
  eventTime: '10:00',
  category: 'holiday',
  isRecurring: false
};

const renderTrips = () =>
  render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<EventCountdown />} />
        <Route path="/events/:eventId" element={<div>Opened trip Canada</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('EventCountdown trip cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('opens Trip Home when the main card surface is clicked', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{
        ...baseTrip,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: false,
          targetAmount: 2400,
          recordedTotal: 1800
        }
      }]
    });

    renderTrips();

    fireEvent.click(await screen.findByText('£1,800 of £2,400 contributed'));
    expect(screen.getByText('Opened trip Canada')).toBeInTheDocument();
  });

  it('does not show Trip Money action buttons on the list', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [
        { ...baseTrip, tripMoney: null },
        {
          ...baseTrip,
          _id: 'trip-review',
          title: 'Review trip',
          tripMoney: {
            _id: 'pot-review',
            name: 'Review costs',
            targetAmount: 2400,
            recordedTotal: 2400
          }
        },
        {
          ...baseTrip,
          _id: 'trip-closed',
          title: 'Closed trip',
          tripMoney: {
            _id: 'pot-closed',
            name: 'Closed costs',
            isDeleted: true,
            targetAmount: 2400,
            recordedTotal: 2400
          }
        }
      ]
    });

    renderTrips();

    expect(await screen.findByRole('link', { name: 'Open Canada' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /review trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view closed trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view closed trip money/i })).not.toBeInTheDocument();
    expect(screen.getByText('Trip Money closed')).toBeInTheDocument();
  });

  it('keeps Remove trip independent of opening Trip Home', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{ ...baseTrip, tripMoney: null }]
    });
    (mockedAxios.delete as jest.Mock).mockResolvedValue({ data: {} });

    renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /remove trip/i }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/events/trip-canada');
    });
    expect(screen.queryByText('Opened trip Canada')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Canada' })).toBeInTheDocument();
  });

  it('opens Trip Home with Enter on the focused card', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{ ...baseTrip, tripMoney: null }]
    });

    renderTrips();

    const card = await screen.findByRole('link', { name: 'Open Canada' });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByText('Opened trip Canada')).toBeInTheDocument();
  });
});
