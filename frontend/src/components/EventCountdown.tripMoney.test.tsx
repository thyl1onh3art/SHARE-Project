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

function mockListGets(events: unknown[] = [], finance: unknown[] = [], pots: unknown[] = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/finance')) {
      return Promise.resolve({ data: finance });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: pots });
    }
    return Promise.resolve({ data: events });
  });
}

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
    mockListGets([{
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
    }]);

    renderTrips();

    expect(await screen.findByText(/£1,800 contributed/)).toBeInTheDocument();
    expect(screen.getByText(/your remaining: £350/i)).toBeInTheDocument();
    expect(screen.getByText(/4 members/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/£1,800 contributed/));
    expect(screen.getByText('Opened pot pot-canada')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('opens Set up Trip Money when the trip has no linked pot', async () => {
    mockListGets([{ ...baseTrip, tripMoney: null }]);

    renderTrips();

    fireEvent.click(await screen.findByRole('heading', { name: 'Canada' }));
    expect(screen.getByText('Set up Trip Money event=trip-canada name=Canada')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('opens closed Trip Money directly from the card', async () => {
    mockListGets([{
      ...baseTrip,
      tripMoney: {
        _id: 'pot-closed',
        name: 'Canada costs',
        isDeleted: true,
        targetAmount: 2400,
        recordedTotal: 2400
      }
    }]);

    renderTrips();

    expect(await screen.findByRole('button', { name: /show archived accounts/i })).toBeInTheDocument();
    expect(screen.queryByText('Shared Account closed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show archived accounts/i }));
    fireEvent.click(await screen.findByText('Shared Account closed'));
    expect(screen.getByText('Opened pot pot-closed')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('does not show Trip Money action buttons on the list', async () => {
    mockListGets([
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
    ]);

    renderTrips();

    expect(await screen.findByRole('link', { name: 'Open Canada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Shared Accounts' })).toBeInTheDocument();
    expect(screen.queryByText('Your balance')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /review trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view closed trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view closed trip money/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Shared Account closed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show archived accounts/i }));
    expect(screen.getByText('Shared Account closed')).toBeInTheDocument();
  });

  it('keeps Remove trip independent of opening Trip Money', async () => {
    mockListGets([{ ...baseTrip, tripMoney: null }]);
    (mockedAxios.delete as jest.Mock).mockResolvedValue({ data: {} });

    renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^remove$/i }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/events/trip-canada');
    });
    expect(screen.queryByText(/Opened pot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Set up Trip Money event=/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Canada' })).toBeInTheDocument();
  });

  it('creates a trip with a target and opens linked Trip Money', async () => {
    mockListGets([]);
    (mockedAxios.post as jest.Mock).mockResolvedValue({
      data: {
        event: { _id: 'trip-new', title: 'Ibiza' },
        sharedAccount: { _id: 'pot-new', name: 'Ibiza', targetAmount: 1000 }
      }
    });

    const { container } = renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^create shared account$/i }));
    expect(screen.getByRole('heading', { name: 'Create Shared Account' })).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Ibiza' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2027-06-01' } });
    fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/^target$/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /^create shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/events/with-trip-money',
        expect.objectContaining({
          title: 'Ibiza',
          eventDate: '2027-06-01',
          eventTime: '10:00',
          targetAmount: 1000
        })
      );
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Opened pot pot-new')).toBeInTheDocument();
    expect(screen.queryByText(/set up trip money/i)).not.toBeInTheDocument();
  });

  it('shows older unlinked Trip Money as a secondary list', async () => {
    mockListGets(
      [{ ...baseTrip, tripMoney: { _id: 'pot-canada', name: 'Canada costs', targetAmount: 2400, recordedTotal: 0 } }],
      [],
      [
        { _id: 'legacy-1', name: 'Old hotel pot', targetAmount: 400 },
        { _id: 'linked-hidden', name: 'Should hide', event: 'trip-canada', targetAmount: 100 }
      ]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Older Accounts' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /old hotel pot/i }));
    expect(screen.getByText('Opened pot legacy-1')).toBeInTheDocument();
    expect(screen.queryByText('Should hide')).not.toBeInTheDocument();
  });

  it('hides the older Trip Money section when every pot is linked', async () => {
    mockListGets(
      [{ ...baseTrip, tripMoney: { _id: 'pot-canada', name: 'Canada costs', targetAmount: 2400, recordedTotal: 0 } }],
      [],
      [{ _id: 'pot-canada', name: 'Canada costs', event: 'trip-canada', targetAmount: 2400 }]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Older Accounts' })).not.toBeInTheDocument();
  });

  it('rejects a £0 target without creating a trip', async () => {
    mockListGets([]);

    const { container } = renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^create shared account$/i }));
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Ibiza' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2027-06-01' } });
    fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/^target$/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /^create shared account$/i }));

    expect(await screen.findByText(/target must be greater than 0/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not create a second trip when Create Trip is clicked twice', async () => {
    mockListGets([]);
    let resolvePost: (value: unknown) => void = () => undefined;
    (mockedAxios.post as jest.Mock).mockImplementation(
      () => new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    const { container } = renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^create shared account$/i }));
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Ibiza' } });
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2027-06-01' } });
    fireEvent.change(container.querySelector('input[type="time"]') as HTMLInputElement, { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/^target$/i), { target: { value: '1000' } });
    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(submit).toBeDisabled();
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    resolvePost({
      data: {
        event: { _id: 'trip-new', title: 'Ibiza' },
        sharedAccount: { _id: 'pot-new', name: 'Ibiza', targetAmount: 1000 }
      }
    });
    expect(await screen.findByText('Opened pot pot-new')).toBeInTheDocument();
  });
});
