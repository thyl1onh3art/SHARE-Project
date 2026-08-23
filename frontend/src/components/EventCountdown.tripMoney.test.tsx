import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
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

const OpenedPot = () => {
  const { accountId } = useParams();
  return <div>Opened pot {accountId}</div>;
};

const SetupTripMoney = () => {
  const [search] = useSearchParams();
  return (
    <div>
      Set up Trip Money event={search.get('event')} name={search.get('name')}
    </div>
  );
};

const renderTrips = () =>
  render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<EventCountdown />} />
        <Route path="/events/:eventId" element={<div>Unexpected Trip Home</div>} />
        <Route path="/shared-accounts" element={<SetupTripMoney />} />
        <Route path="/shared-accounts/:accountId" element={<OpenedPot />} />
      </Routes>
    </MemoryRouter>
  );

describe('EventCountdown trip cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('opens linked Trip Money directly from the card', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{
        ...baseTrip,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: false,
          targetAmount: 2400,
          recordedTotal: 1800,
          yourContribution: 250,
          owner: { _id: 'u1', firstName: 'Sam' },
          members: [
            { _id: 'u2', firstName: 'Alex' },
            { _id: 'u3', firstName: 'Jo' },
            { _id: 'u4', firstName: 'Pat' }
          ]
        }
      }]
    });

    renderTrips();

    expect(await screen.findByText(/£1,800 of £2,400 contributed/)).toBeInTheDocument();
    expect(screen.getByText(/your remaining: £350/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/£1,800 of £2,400 contributed/));
    expect(screen.getByText('Opened pot pot-canada')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('opens Set up Trip Money when the trip has no linked pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{ ...baseTrip, tripMoney: null }]
    });

    renderTrips();

    fireEvent.click(await screen.findByRole('heading', { name: 'Canada' }));
    expect(screen.getByText('Set up Trip Money event=trip-canada name=Canada')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('opens closed Trip Money directly from the card', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{
        ...baseTrip,
        tripMoney: {
          _id: 'pot-closed',
          name: 'Canada costs',
          isDeleted: true,
          targetAmount: 2400,
          recordedTotal: 2400
        }
      }]
    });

    renderTrips();

    fireEvent.click(await screen.findByText('Trip Money closed'));
    expect(screen.getByText('Opened pot pot-closed')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
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

  it('keeps Remove trip independent of opening Trip Money', async () => {
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
    expect(screen.queryByText(/Opened pot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Set up Trip Money event=/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Canada' })).toBeInTheDocument();
  });

  it('creates a trip from the list form', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({ data: [] });
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: { _id: 'trip-new', title: 'Ibiza' }
    });

    const { container } = renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^create trip$/i }));
    fireEvent.change(screen.getByPlaceholderText(/amsterdam weekend/i), { target: { value: 'Ibiza' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2027-06-01' } });
    fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: /^save trip$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({ title: 'Ibiza', eventDate: '2027-06-01', eventTime: '10:00' })
      );
    });
  });
});
