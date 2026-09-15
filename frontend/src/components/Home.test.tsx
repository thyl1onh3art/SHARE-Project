import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
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

function mockHomeApis({
  finance = [] as unknown[] | Promise<unknown>,
  accounts = [] as unknown[],
  events = [] as unknown[],
  payments = [] as unknown[],
  invites = [] as unknown[]
} = {}) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/finance')) {
      if (finance instanceof Promise) return finance;
      return Promise.resolve({ data: finance });
    }
    if (typeof url === 'string' && url.startsWith('/shared-accounts')) {
      return Promise.resolve({ data: accounts });
    }
    if (typeof url === 'string' && url.startsWith('/events')) {
      return Promise.resolve({ data: events });
    }
    if (typeof url === 'string' && url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: payments });
    }
    if (typeof url === 'string' && url.startsWith('/invites/list')) {
      return Promise.resolve({ data: invites });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shared-accounts/:accountId" element={<div>Opened Shared Account detail</div>} />
        <Route path="/events" element={<div>Shared Accounts overview</div>} />
        <Route path="/invitations" element={<div>Notifications page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const owner = { _id: 'user-1', firstName: 'Sam' };

describe('Home dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Home with the prototype balance and disclaimer', async () => {
    mockHomeApis({
      finance: [
        { type: 'input', amount: 400 },
        { type: 'output', amount: 50 }
      ]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(await screen.findByText('£350.00')).toBeInTheDocument();
    expect(screen.getByText('Prototype balance — no real money is held.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Your Shared Accounts' })).toBeInTheDocument();
    expect(screen.queryByText(/safeguard|bank account|fscs|stored-value/i)).not.toBeInTheDocument();
  });

  it('shows £0.00 when there are no personal records', async () => {
    mockHomeApis();

    renderHome();

    expect(await screen.findByText('£0.00')).toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
  });

  it('excludes Shared Account rows from the home balance', async () => {
    mockHomeApis({
      finance: [
        { type: 'input', amount: 20 },
        { type: 'input', amount: 80, sharedAccount: 'pot-1' },
        { type: 'output', amount: 5 }
      ]
    });

    renderHome();

    expect(await screen.findByText('£15.00')).toBeInTheDocument();
  });

  it('shows a loading state for the balance without hiding Home', async () => {
    let resolveFinance: (value: { data: unknown[] }) => void = () => undefined;
    const financePromise = new Promise<{ data: unknown[] }>((resolve) => {
      resolveFinance = resolve;
    });
    mockHomeApis({ finance: financePromise });

    renderHome();

    expect(await screen.findByText('Your balance')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();

    resolveFinance({ data: [{ type: 'input', amount: 12 }] });
    expect(await screen.findByText('£12.00')).toBeInTheDocument();
  });

  it('keeps Home usable when the balance request fails', async () => {
    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.startsWith('/finance')) {
        return Promise.reject({ response: { data: { message: 'ECONNREFUSED mongodb://localhost' } } });
      }
      return Promise.resolve({ data: [] });
    });

    renderHome();

    expect(await screen.findByText("Couldn't load your balance")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByText(/ECONNREFUSED|mongodb/i)).not.toBeInTheDocument();
  });

  it('shows active Shared Accounts with funded amount, target, progress, and status', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada fund',
        targetAmount: 500,
        targetDate: '2027-06-01',
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 200 }]
      }],
      events: [{
        title: 'Canada fund',
        eventDate: '2027-06-01',
        tripMoney: {
          _id: 'pot-canada',
          name: 'Canada fund',
          recordedTotal: 200,
          targetAmount: 500,
          targetDate: '2027-06-01',
          owner,
          isDeleted: false
        }
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Canada fund' })).toBeInTheDocument();
    expect(screen.getByText(/£200 of £500/)).toBeInTheDocument();
    expect(screen.getByText(/40% funded/)).toBeInTheDocument();
    expect(screen.getByText(/Open ·/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Canada fund' })).toHaveAttribute('href', '/shared-accounts/pot-canada');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not dump archived or closed accounts onto Home', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-open',
        name: 'Open weekend',
        targetAmount: 100,
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 20 }]
      }],
      events: [{
        title: 'Closed ski trip',
        tripMoney: {
          _id: 'pot-closed',
          name: 'Closed ski trip',
          isDeleted: true,
          recordedTotal: 80,
          targetAmount: 80,
          owner
        }
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Open weekend' })).toBeInTheDocument();
    expect(screen.queryByText('Closed ski trip')).not.toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringMatching(/archived=true/));
  });

  it('opens the existing Shared Account detail from a Home card', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada fund',
        targetAmount: 500,
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 200 }]
      }]
    });

    renderHome();

    fireEvent.click(await screen.findByRole('link', { name: 'Open Canada fund' }));
    expect(await screen.findByText('Opened Shared Account detail')).toBeInTheDocument();
  });

  it('uses the Task 21 create flow and the Shared Accounts overview for view all', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada fund',
        targetAmount: 500,
        owner,
        members: [],
        financeRecords: []
      }]
    });

    renderHome();

    const create = await screen.findByRole('link', { name: 'Create Shared Account' });
    expect(create).toHaveAttribute('href', '/events?create=1');
    expect(screen.getByRole('link', { name: 'View all Shared Accounts' })).toHaveAttribute('href', '/events');
    expect(screen.queryByRole('link', { name: /create event/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/location/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^type$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bEvent\b/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'View all Shared Accounts' }));
    expect(await screen.findByText('Shared Accounts overview')).toBeInTheDocument();
  });

  it('shows a useful empty state instead of a broken dashboard', async () => {
    mockHomeApis();

    renderHome();

    expect(await screen.findByText("You don't have any Shared Accounts yet.")).toBeInTheDocument();
    expect(screen.getByText('Create one to start contributing together.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Shared Account' })).toHaveAttribute('href', '/events?create=1');
    expect(screen.queryByRole('link', { name: 'View all Shared Accounts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Needs your attention' })).not.toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
  });

  it('hides Needs your attention when nothing needs action', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-open',
        name: 'Open weekend',
        targetAmount: 400,
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 40 }]
      }],
      invites: [{
        _id: 'sent-invite',
        status: 'pending',
        recipientEmail: 'alex@example.com',
        expiresAt: '2028-01-01',
        sharedAccount: { name: 'Open weekend' }
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Open weekend' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Needs your attention' })).not.toBeInTheDocument();
  });

  it('shows pending invitations and payment actions as attention items', async () => {
    mockHomeApis({
      accounts: [
        {
          _id: 'pot-approve',
          name: 'Task 20 group account',
          targetAmount: 200,
          owner,
          members: [{ _id: 'user-2' }],
          financeRecords: [{ type: 'input', amount: 200 }]
        },
        {
          _id: 'pot-pay',
          name: 'Holiday fund',
          targetAmount: 80,
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 80 }]
        },
        {
          _id: 'pot-close',
          name: 'Done fund',
          targetAmount: 90,
          owner,
          members: [],
          financeRecords: [{ type: 'input', amount: 90 }]
        }
      ],
      payments: [
        {
          _id: 'pr-pending',
          status: 'pending',
          sharedAccount: { _id: 'pot-approve', name: 'Task 20 group account' },
          requestedBy: { _id: 'user-2' },
          approvals: [],
          rejections: []
        },
        {
          _id: 'pr-done',
          status: 'executed',
          sharedAccount: { _id: 'pot-close', name: 'Done fund' },
          requestedBy: owner
        }
      ],
      invites: [{
        _id: 'inv-1',
        status: 'pending',
        recipientEmail: 'sam@example.com',
        expiresAt: '2028-01-01',
        sharedAccount: { name: 'Weekend fund' }
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Needs your attention' })).toBeInTheDocument();
    expect(screen.getByText('Invitation to join')).toBeInTheDocument();
    expect(screen.getByText('Weekend fund')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review Weekend fund' })).toHaveAttribute('href', '/invitations');
    expect(screen.getAllByText('Payment approval needed').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Review Task 20 group account' })).toHaveAttribute('href', '/shared-accounts/pot-approve');
    expect(screen.getByText('Shared Account ready to pay')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open account Holiday fund' })).toHaveAttribute('href', '/shared-accounts/pot-pay?pay=now');
    expect(screen.getAllByText('Payment completed').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Close Shared Account Done fund' })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-close?close=now'
    );

    fireEvent.click(screen.getByRole('link', { name: 'Review Weekend fund' }));
    expect(await screen.findByText('Notifications page')).toBeInTheDocument();
  });

  it('shows contribution-plan setup as attention for an accepted member', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-plan',
        name: 'Member plan fund',
        targetAmount: 120,
        owner: { _id: 'user-2' },
        members: [owner],
        financeRecords: [{ type: 'input', amount: 10 }],
        contributionPlans: []
      }]
    });

    renderHome();

    expect(await screen.findByText('Set up your contribution plan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up Member plan fund' })).toHaveAttribute(
      'href',
      '/shared-accounts/pot-plan?setupPlan=1'
    );
  });

  it('previews a small number of accounts instead of the full list', async () => {
    mockHomeApis({
      accounts: [1, 2, 3, 4, 5].map((n) => ({
        _id: `pot-${n}`,
        name: `Preview fund ${n}`,
        targetAmount: 100,
        targetDate: `2028-0${n}-01`,
        owner,
        members: [],
        financeRecords: [{ type: 'input', amount: 10 }]
      }))
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Preview fund 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Preview fund 4' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Preview fund 5' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all Shared Accounts' })).toBeInTheDocument();
  });

  it('shows Organiser on a Home card the current user owns', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner,
        members: [{ _id: 'user-2' }],
        financeRecords: [{ type: 'input', amount: 50 }]
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Organiser' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
    expect(document.querySelector('.shared-account-title-row')).toBeTruthy();
    expect(document.querySelector('.shared-account-title-row')).toHaveClass('home-account-heading');
  });

  it('shows Shared with you on a Home card the current user joined', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-weekend',
        name: 'Weekend Fund',
        targetAmount: 120,
        owner: { _id: 'user-2' },
        members: [owner],
        financeRecords: [{ type: 'input', amount: 10 }]
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Weekend Fund' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('does not invent a Home badge when ownership cannot be determined', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-legacy',
        name: 'Legacy hotel pot',
        targetAmount: 80,
        financeRecords: [{ type: 'input', amount: 10 }]
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Legacy hotel pot' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });

  it('shows Shared with you on Home after ownership is transferred away and the user remains a member', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner: { _id: 'user-2', firstName: 'Alex' },
        members: [owner],
        financeRecords: [{ type: 'input', amount: 50 }]
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Shared with you' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
  });

  it('shows no Home badge after ownership is transferred away and the user is no longer a member', async () => {
    mockHomeApis({
      accounts: [{
        _id: 'pot-canada',
        name: 'Canada Holiday',
        targetAmount: 500,
        owner: { _id: 'user-2', firstName: 'Alex' },
        members: [],
        financeRecords: [{ type: 'input', amount: 50 }]
      }]
    });

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Canada Holiday' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Organiser' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Shared with you' })).not.toBeInTheDocument();
  });
});
