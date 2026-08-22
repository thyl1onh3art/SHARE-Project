import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
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

const renderTripHome = () =>
  render(
    <MemoryRouter initialEntries={['/events/trip-canada']}>
      <Routes>
        <Route path="/events/:eventId" element={<TripHome />} />
        <Route path="/shared-accounts" element={<SetupTripMoney />} />
        <Route path="/shared-accounts/:accountId" element={<OpenedPot />} />
      </Routes>
    </MemoryRouter>
  );

describe('TripHome redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects an unlinked trip to Set up Trip Money', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: { _id: 'trip-canada', title: 'Canada', tripMoney: null }
    });

    renderTripHome();

    expect(await screen.findByText('Set up Trip Money event=trip-canada name=Canada')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Canada' })).not.toBeInTheDocument();
  });

  it('redirects a linked trip to its Trip Money pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        _id: 'trip-canada',
        title: 'Canada',
        tripMoney: { _id: 'pot-canada', name: 'Canada costs', isDeleted: false }
      }
    });

    renderTripHome();

    expect(await screen.findByText('Opened pot pot-canada')).toBeInTheDocument();
  });

  it('redirects a closed linked trip to its read-only pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: {
        _id: 'trip-canada',
        title: 'Canada',
        tripMoney: { _id: 'pot-closed', name: 'Canada costs', isDeleted: true }
      }
    });

    renderTripHome();

    expect(await screen.findByText('Opened pot pot-closed')).toBeInTheDocument();
  });
});
