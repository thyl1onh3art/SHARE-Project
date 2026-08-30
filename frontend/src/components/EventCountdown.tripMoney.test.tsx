import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import EventCountdown from './EventCountdown';
import SharedAccountDetail from './SharedAccountDetail';
import { formatLocalYmd } from '../utils/tripHome';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
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

function mockListGets(
  events: unknown[] = [],
  finance: unknown[] = [],
  pots: unknown[] = [],
  archived: unknown[] = [],
  payments: unknown[] = []
) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/finance')) {
      return Promise.resolve({ data: finance });
    }
    if (typeof url === 'string' && url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: payments });
    }
    if (typeof url === 'string' && url.includes('archived=true')) {
      return Promise.resolve({ data: archived });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts/')) {
      const id = url.split('/')[2]?.split('?')[0];
      const fromPots = [...pots, ...archived].find((account: any) => account && String(account._id) === id);
      if (fromPots) {
        return Promise.resolve({ data: fromPots });
      }
      const fromEvents = (events as any[]).find((event) => String(event?.tripMoney?._id) === id);
      return Promise.resolve({ data: fromEvents?.tripMoney || {} });
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

const owner = {
  _id: 'user-1',
  firstName: 'Sam',
  lastName: 'Brown',
  email: 'sam@example.com'
};

const member = {
  _id: 'user-2',
  firstName: 'Alex',
  lastName: 'Friend',
  email: 'alex@example.com'
};

const fundedPot = {
  _id: 'pot-full',
  name: 'Canada costs',
  owner,
  members: [member],
  targetAmount: 1000,
  isDeleted: false,
  financeRecords: [{ _id: 'r-full', type: 'input', amount: 1000, user: owner }]
};

const fundedTrip = {
  ...baseTrip,
  tripMoney: {
    _id: 'pot-full',
    name: 'Canada costs',
    isDeleted: false,
    targetAmount: 1000,
    recordedTotal: 1000,
    yourContribution: 1000,
    owner,
    members: [member]
  }
};

const OpenedPot = () => {
  const { accountId } = useParams();
  const [search] = useSearchParams();
  return (
    <div>
      Opened pot {accountId}
      {search.get('pay') === 'now' ? ' with pay=now' : ''}
      {search.get('close') === 'now' ? ' with close=now' : ''}
    </div>
  );
};

const SetupTripMoney = () => {
  const [search] = useSearchParams();
  if (search.get('archived') === '1') {
    return <div>All closed accounts</div>;
  }
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

  it('shows an accepted-member Shared Account and opens it without Remove', async () => {
    mockListGets([{
      ...baseTrip,
      ownedByCurrentUser: false,
      tripMoney: {
        _id: 'pot-canada',
        name: 'Canada costs',
        isDeleted: false,
        targetAmount: 2400,
        recordedTotal: 1800,
        yourContribution: 0,
        owner: { _id: 'owner-1', firstName: 'Sam', lastName: 'Organiser' },
        members: [{ _id: 'member-1', firstName: 'Alex', lastName: 'Friend' }]
      }
    }]);

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    expect(screen.getByText(/£2,400/)).toBeInTheDocument();
    expect(screen.getByText(/£1,800 contributed/)).toBeInTheDocument();
    expect(screen.getByText(/2 members/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Open Canada' }));
    expect(screen.getByText('Opened pot pot-canada')).toBeInTheDocument();
  });

  it('does not invent a card when GET /events is empty (pending invite)', async () => {
    mockListGets(
      [],
      [],
      []
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Canada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Older Accounts' })).not.toBeInTheDocument();
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

  it('does not list an Event that has no Shared Account', async () => {
    mockListGets([{ ...baseTrip, tripMoney: null }]);

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Shared Accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Canada' })).not.toBeInTheDocument();
    expect(screen.queryByText(/set up trip money/i)).not.toBeInTheDocument();
  });

  it('opens closed Trip Money from Recently Closed', async () => {
    mockListGets(
      [{
        ...baseTrip,
        tripMoney: {
          _id: 'pot-closed',
          name: 'Canada costs',
          isDeleted: true,
          targetAmount: 2400,
          recordedTotal: 2400
        }
      }],
      [],
      [],
      [{
        _id: 'pot-closed',
        name: 'Canada costs',
        isDeleted: true,
        deletedAt: '2026-08-20T00:00:00.000Z',
        targetAmount: 2400
      }]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Recently Closed' })).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Older Accounts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show archived accounts/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Shared Account closed'));
    expect(screen.getByText('Opened pot pot-closed')).toBeInTheDocument();
    expect(screen.queryByText('Unexpected Trip Home')).not.toBeInTheDocument();
  });

  it('does not show Trip Money action buttons on the list', async () => {
    mockListGets(
      [
        {
          ...baseTrip,
          tripMoney: {
            _id: 'pot-canada',
            name: 'Canada costs',
            isDeleted: false,
            targetAmount: 2400,
            recordedTotal: 1800
          }
        },
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
      ],
      [],
      [],
      [{
        _id: 'pot-closed',
        name: 'Closed costs',
        isDeleted: true,
        deletedAt: '2026-08-20T00:00:00.000Z'
      }]
    );

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
    expect(screen.getByRole('heading', { name: 'Recently Closed' })).toBeInTheDocument();
    expect(screen.getByText('Shared Account closed')).toBeInTheDocument();
  });

  it('does not show Remove on linked owner, unlinked owner, or accepted-member cards', async () => {
    mockListGets(
      [
        {
          ...baseTrip,
          tripMoney: {
            _id: 'pot-canada',
            name: 'Canada costs',
            isDeleted: false,
            targetAmount: 2400,
            recordedTotal: 0,
            owner,
            members: []
          }
        },
        {
          ...baseTrip,
          _id: 'trip-member',
          title: 'Member trip',
          ownedByCurrentUser: false,
          tripMoney: {
            _id: 'pot-member',
            name: 'Member costs',
            targetAmount: 1000,
            recordedTotal: 400,
            owner: { _id: 'owner-1' },
            members: [{ _id: 'user-1' }]
          }
        }
      ],
      [],
      [{
        _id: 'legacy-1',
        name: 'Old hotel pot',
        targetAmount: 400,
        owner,
        members: []
      }]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Old hotel pot' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Member trip' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('still opens account detail with internal delete and settings controls', async () => {
    const solePot = { ...fundedPot, members: [] };
    const soleTrip = {
      ...fundedTrip,
      tripMoney: {
        ...fundedTrip.tripMoney,
        members: [],
        recordedTotal: 0,
        yourContribution: 0,
        targetAmount: 1000
      }
    };
    mockListGets(
      [soleTrip],
      [],
      [solePot]
    );

    render(
      <MemoryRouter initialEntries={['/events']}>
        <Routes>
          <Route path="/events" element={<EventCountdown />} />
          <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('link', { name: 'Open Canada' }));

    expect(await screen.findByRole('button', { name: /^delete shared account$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Shared Account settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^archive shared account$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
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
    expect(screen.getByLabelText(/^date/i)).toBeInTheDocument();
    expect(container.querySelector('input[type="date"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="time"]')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/start time/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Ibiza' } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2027-06-01' } });
    fireEvent.change(screen.getByLabelText(/^target$/i), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: /^create shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/events/with-trip-money',
        expect.objectContaining({
          title: 'Ibiza',
          eventDate: '2027-06-01',
          eventTime: '00:00',
          targetAmount: 1000
        })
      );
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Opened pot pot-new')).toBeInTheDocument();
    expect(screen.queryByText(/set up trip money/i)).not.toBeInTheDocument();
  });

  it('counts down from the selected calendar day and ignores stored time', async () => {
    const now = new Date();
    const today = formatLocalYmd(now);
    const yesterday = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const inFiveDays = formatLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5));

    mockListGets([
      {
        ...baseTrip,
        _id: 'trip-today',
        title: 'Today account',
        eventDate: today,
        eventTime: '23:59',
        tripMoney: { _id: 'pot-today', name: 'Today account', targetAmount: 400, recordedTotal: 0 }
      },
      {
        ...baseTrip,
        _id: 'trip-past',
        title: 'Past account',
        eventDate: yesterday,
        eventTime: '10:00',
        tripMoney: { _id: 'pot-past', name: 'Past account', targetAmount: 400, recordedTotal: 0 }
      },
      {
        ...baseTrip,
        _id: 'trip-soon',
        title: 'Soon account',
        eventDate: inFiveDays,
        eventTime: '06:00',
        tripMoney: { _id: 'pot-soon', name: 'Soon account', targetAmount: 400, recordedTotal: 0 }
      }
    ]);

    renderTrips();

    expect(await screen.findByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('5 days to go')).toBeInTheDocument();
    expect(screen.queryByText(/-\d+\s+days to go/i)).not.toBeInTheDocument();
  });

  it('shows unlinked legacy accounts in Active Shared Accounts, not Older Accounts', async () => {
    mockListGets(
      [{ ...baseTrip, tripMoney: { _id: 'pot-canada', name: 'Canada costs', targetAmount: 2400, recordedTotal: 0 } }],
      [],
      [
        { _id: 'legacy-1', name: 'Old hotel pot', targetAmount: 400 },
        { _id: 'pot-canada', name: 'Canada costs', event: 'trip-canada', targetAmount: 2400 }
      ]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Old hotel pot' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Canada' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Older Accounts' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Open Old hotel pot' }));
    expect(screen.getByText('Opened pot legacy-1')).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2027-06-01' } });
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
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: '2027-06-01' } });
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

  it('keeps closed accounts out of Active Shared Accounts and previews the newest one', async () => {
    mockListGets(
      [],
      [],
      [{ _id: 'pot-open', name: 'Owner live pot', targetAmount: 600, owner: { _id: 'u1' }, members: [] }],
      [
        { _id: 'pot-old', name: 'Older closed', isDeleted: true, deletedAt: '2026-01-01T00:00:00.000Z' },
        { _id: 'pot-new-closed', name: 'Newest closed', isDeleted: true, deletedAt: '2026-08-27T12:00:00.000Z' },
        { _id: 'pot-mid', name: 'Mid closed', isDeleted: true, deletedAt: '2026-06-01T00:00:00.000Z' }
      ]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Owner live pot' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recently Closed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Newest closed' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Older closed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mid closed' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /show more closed accounts/i }));
    expect(screen.getByRole('heading', { name: 'Mid closed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Older closed' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show fewer closed accounts/i }));
    expect(screen.queryByRole('heading', { name: 'Mid closed' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Newest closed' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /view all closed accounts/i }));
    expect(screen.getByText('All closed accounts')).toBeInTheDocument();
  });

  it('uses a middle-dot separator on active linked, unlinked, and member cards without mojibake', async () => {
    mockListGets(
      [{
        ...baseTrip,
        ownedByCurrentUser: false,
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada costs',
          isDeleted: false,
          targetAmount: 150,
          recordedTotal: 150,
          yourContribution: 0,
          owner: { _id: 'owner-1', firstName: 'Sam' },
          members: [{ _id: 'member-1', firstName: 'Alex' }]
        }
      }],
      [],
      [
        {
          _id: 'legacy-1',
          name: 'Old hotel pot',
          targetAmount: 150,
          owner: { _id: 'u1' },
          members: [],
          financeRecords: [{ type: 'input', amount: 150 }]
        },
        {
          _id: 'pot-canada',
          name: 'Canada costs',
          event: 'trip-canada',
          targetAmount: 150
        }
      ]
    );

    renderTrips();

    const linkedCard = (await screen.findByRole('heading', { name: 'Canada' })).closest('.trip-list-card') as HTMLElement;
    const unlinkedCard = screen.getByRole('heading', { name: 'Old hotel pot' }).closest('.trip-list-card') as HTMLElement;
    const linkedSummary = linkedCard.querySelector('.trip-list-money') as HTMLElement;
    const unlinkedSummary = unlinkedCard.querySelector('.trip-list-money') as HTMLElement;

    expect(linkedSummary).toHaveTextContent(
      'Target £150 · £150 contributed · Still needed £0 · 2 members · Your remaining: £75'
    );
    expect(unlinkedSummary).toHaveTextContent(
      'Target £150 · £150 contributed · Still needed £0 · 1 member · Your remaining: £150'
    );
    expect(linkedSummary.textContent).toContain('·');
    expect(linkedSummary.textContent).not.toContain('Â·');
    expect(unlinkedSummary.textContent).not.toContain('Â·');
    expect(document.body.textContent).not.toMatch(/Â·|â€™|â€œ|â€”|â€“/);

    fireEvent.click(screen.getByRole('link', { name: 'Open Canada' }));
    expect(screen.getByText('Opened pot pot-canada')).toBeInTheDocument();
  });

  it('uses the correct separator on an unlinked legacy card and does not render Â· anywhere on the list', async () => {
    mockListGets(
      [],
      [],
      [{
        _id: 'legacy-1',
        name: 'Old hotel pot',
        targetAmount: 150,
        owner: { _id: 'u1' },
        members: [],
        financeRecords: [{ type: 'input', amount: 150 }]
      }]
    );

    renderTrips();

    const unlinkedSummary = await screen.findByText(/Target £150/);
    expect(unlinkedSummary).toHaveTextContent(
      'Target £150 · £150 contributed · Still needed £0 · 1 member · Your remaining: £150'
    );
    expect(unlinkedSummary.textContent).toContain('·');
    expect(unlinkedSummary.textContent).not.toContain('Â·');
    expect(document.body.textContent).not.toMatch(/Â·|â€™|â€œ|â€”|â€“/);

    fireEvent.click(screen.getByRole('link', { name: 'Open Old hotel pot' }));
    expect(screen.getByText('Opened pot legacy-1')).toBeInTheDocument();
  });

  it('does not show Pay now below target', async () => {
    mockListGets([{
      ...baseTrip,
      tripMoney: {
        _id: 'pot-canada',
        name: 'Canada costs',
        targetAmount: 1000,
        recordedTotal: 750
      }
    }]);

    renderTrips();

    expect(await screen.findByText(/Still needed £250/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
  });

  it('shows Pay now on a 100% funded active card and at-or-over target', async () => {
    mockListGets([
      {
        ...baseTrip,
        tripMoney: {
          _id: 'pot-full',
          name: 'Canada costs',
          targetAmount: 1000,
          recordedTotal: 1000,
          owner,
          members: [member]
        }
      },
      {
        ...baseTrip,
        _id: 'trip-over',
        title: 'Over target',
        tripMoney: {
          _id: 'pot-over',
          name: 'Over costs',
          targetAmount: 1000,
          recordedTotal: 1100
        }
      }
    ]);

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Canada' })).toBeInTheDocument();
    const payNowButtons = screen.getAllByRole('button', { name: /^pay now$/i });
    expect(payNowButtons).toHaveLength(2);
    payNowButtons.forEach((button) => {
      expect(button).toHaveClass('btn-success');
      expect(button).not.toBeDisabled();
    });
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
  });

  it('opens the existing Final payment form from Pay now without creating a payment', async () => {
    mockListGets(
      [fundedTrip],
      [{ _id: 'r-full', type: 'input', amount: 1000, user: owner, date: '2026-08-23T00:00:00.000Z' }],
      [fundedPot]
    );

    render(
      <MemoryRouter initialEntries={['/events']}>
        <Routes>
          <Route path="/events" element={<EventCountdown />} />
          <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /^pay now$/i }));

    expect(await screen.findByRole('heading', { name: 'Final payment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue('£1000.00');
    expect(screen.getByLabelText(/^supplier$/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Final payment' })).toHaveLength(1);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('keeps card clicks on detail and Pay now on the payment flow', async () => {
    mockListGets([fundedTrip], [], [fundedPot]);

    renderTrips();

    fireEvent.click(await screen.findByRole('heading', { name: 'Canada' }));
    expect(screen.getByText('Opened pot pot-full')).toBeInTheDocument();
    expect(screen.queryByText('Opened pot pot-full with pay=now')).not.toBeInTheDocument();
  });

  it('does not let Pay now fall through to the normal card navigation', async () => {
    mockListGets([fundedTrip], [], [fundedPot]);

    renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^pay now$/i }));
    expect(screen.getByText('Opened pot pot-full with pay=now')).toBeInTheDocument();
  });

  it('hides Pay now and shows Waiting for approval when a payment is pending', async () => {
    mockListGets(
      [fundedTrip],
      [],
      [fundedPot],
      [],
      [{ _id: 'pr-1', status: 'pending', sharedAccount: { _id: 'pot-full' }, amount: 1000 }]
    );

    renderTrips();

    expect(await screen.findByText('Waiting for approval')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment completed')).not.toBeInTheDocument();
  });

  it('hides Pay now and shows Payment completed after a final payment', async () => {
    mockListGets(
      [fundedTrip],
      [],
      [fundedPot],
      [],
      [{ _id: 'pr-done', status: 'executed', sharedAccount: { _id: 'pot-full' }, amount: 1000 }]
    );

    renderTrips();

    expect(await screen.findByText('Payment completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for approval')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^close shared account$/i })).toHaveClass('btn-primary');
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('never shows Pay now on a closed Shared Account', async () => {
    mockListGets(
      [{
        ...baseTrip,
        tripMoney: {
          _id: 'pot-closed',
          name: 'Canada costs',
          isDeleted: true,
          targetAmount: 1000,
          recordedTotal: 1000
        }
      }],
      [],
      [],
      [{
        _id: 'pot-closed',
        name: 'Canada costs',
        isDeleted: true,
        deletedAt: '2026-08-20T00:00:00.000Z',
        targetAmount: 1000
      }]
    );

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Recently Closed' })).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
  });

  it('shows Pay now to an accepted member on a fully funded account', async () => {
    mockListGets([{
      ...fundedTrip,
      ownedByCurrentUser: false
    }]);

    renderTrips();

    expect(await screen.findByRole('button', { name: /^pay now$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
  });

  it('shows Pay now on an active unlinked fully funded account', async () => {
    mockListGets([], [], [{
      ...fundedPot,
      _id: 'legacy-full',
      name: 'Old hotel pot',
      members: []
    }]);

    renderTrips();

    expect(await screen.findByRole('heading', { name: 'Old hotel pot' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^pay now$/i }));
    expect(screen.getByText('Opened pot legacy-full with pay=now')).toBeInTheDocument();
  });

  it('lets the organiser close a completed account from the dashboard using the existing confirmation', async () => {
    mockListGets(
      [fundedTrip],
      [{ _id: 'r-full', type: 'input', amount: 1000, user: owner, date: '2026-08-23T00:00:00.000Z' }],
      [fundedPot],
      [],
      [{ _id: 'pr-done', status: 'executed', sharedAccount: { _id: 'pot-full' }, amount: 1000 }]
    );
    (mockedAxios.delete as jest.Mock).mockResolvedValue({ data: { isDeleted: true } });

    render(
      <MemoryRouter initialEntries={['/events']}>
        <Routes>
          <Route path="/events" element={<EventCountdown />} />
          <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /^close shared account$/i }));
    expect(await screen.findByRole('heading', { name: 'Close Shared Account?' })).toBeInTheDocument();
    expect(screen.getByText(/move it to your archived shared accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/read-only records/i)).toBeInTheDocument();
    expect(screen.getByText(/no money is moved by this action/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^keep open$/i }));
    expect(screen.queryByRole('heading', { name: 'Close Shared Account?' })).not.toBeInTheDocument();
    expect(mockedAxios.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^close shared account$/i }));
    const dialog = (await screen.findByRole('heading', { name: 'Close Shared Account?' })).closest('.card') as HTMLElement;
    fireEvent.click(within(dialog).getByRole('button', { name: /^close shared account$/i }));

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('/shared-accounts/pot-full');
    });
  });

  it('does not show Close Shared Account to an accepted member after payment completion', async () => {
    mockListGets(
      [{
        ...fundedTrip,
        ownedByCurrentUser: false,
        tripMoney: {
          ...fundedTrip.tripMoney,
          owner: { _id: 'owner-1', firstName: 'Sam' },
          members: [{ _id: 'user-1', firstName: 'Alex' }]
        }
      }],
      [],
      [],
      [],
      [{ _id: 'pr-done', status: 'executed', sharedAccount: { _id: 'pot-full' }, amount: 1000 }]
    );

    renderTrips();

    expect(await screen.findByText('Payment completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close shared account$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pay now$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Open Canada' }));
    expect(screen.getByText('Opened pot pot-full')).toBeInTheDocument();
    expect(screen.queryByText(/with close=now/)).not.toBeInTheDocument();
  });

  it('does not let Close Shared Account fall through to the normal card navigation', async () => {
    mockListGets(
      [fundedTrip],
      [],
      [fundedPot],
      [],
      [{ _id: 'pr-done', status: 'executed', sharedAccount: { _id: 'pot-full' }, amount: 1000 }]
    );

    renderTrips();

    fireEvent.click(await screen.findByRole('button', { name: /^close shared account$/i }));
    expect(screen.getByText('Opened pot pot-full with close=now')).toBeInTheDocument();
  });
});
