import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SharedAccountDetail from './SharedAccountDetail';

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

function mockAccountFetch(account: Record<string, unknown>, records: Array<Record<string, unknown>> = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (url.startsWith('/shared-accounts/')) {
      return Promise.resolve({ data: account });
    }
    if (url.startsWith('/finance')) {
      return Promise.resolve({ data: records });
    }
    if (url.startsWith('/payment-requests')) {
      return Promise.resolve({ data: [] });
    }
    if (url.startsWith('/users/')) {
      return Promise.resolve({ data: owner });
    }
    return Promise.resolve({ data: [] });
  });
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts/pot-1']}>
      <Routes>
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedAccountDetail equal share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows equal share and your remaining from pot members only', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 2400,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 250,
          date: '2026-01-02T00:00:00.000Z',
          user: 'user-1',
          description: 'First share'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByText(/^Each person: £1200.00$/)).toBeInTheDocument();
    expect(screen.getByText(/your contribution:/i)).toHaveTextContent('£250.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£950.00');
    expect(screen.getByText('Equal split is a guide. Contributions can be different.')).toBeInTheDocument();
  });

  it('shows real participant names in Who has contributed, including a £0 member', async () => {
    const richard = {
      _id: 'user-2',
      firstName: 'Richard',
      lastName: 'Brown',
      email: 'richard@example.com'
    };
    const jo = {
      _id: 'user-3',
      firstName: 'Jo',
      lastName: 'Zero',
      email: 'jo@example.com'
    };

    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [richard, jo],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 150,
          date: '2026-08-27T13:10:00.000Z',
          user: owner,
          description: 'Sam share'
        },
        {
          _id: 'r2',
          type: 'input',
          amount: 200,
          date: '2026-08-27T13:22:00.000Z',
          user: richard,
          description: 'Richard share'
        }
      ]
    );

    renderDetail();

    const section = (await screen.findByRole('heading', { name: 'Who has contributed' })).closest('.card') as HTMLElement;
    const names = Array.from(section.querySelectorAll('strong')).map((el) => el.textContent?.trim());
    expect(names).toEqual(['Sam Brown (you)', 'Richard Brown', 'Jo Zero']);
    expect(names.some((name) => name === 'Member')).toBe(false);
    expect(section.textContent).not.toMatch(/\b[a-f0-9]{24}\b/i);
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();

    const rows = section.querySelectorAll('.trip-money-member-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0] as HTMLElement).getByText('£150.00')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getAllByText('£200.00').length).toBeGreaterThan(0);
    expect(within(rows[0] as HTMLElement).getByText('£50.00')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getAllByText('£200.00').length).toBeGreaterThan(0);
    expect(within(rows[1] as HTMLElement).getByText('£0.00')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('Jo Zero')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText('£0.00')).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getAllByText('£200.00').length).toBeGreaterThan(0);

    const history = screen.getByRole('heading', { name: 'Transaction history' }).closest('.card') as HTMLElement;
    expect(within(history).getByText('Sam Brown')).toBeInTheDocument();
    expect(within(history).getByText('Richard Brown')).toBeInTheDocument();
    expect(within(history).getByText('Contributed £150.00')).toBeInTheDocument();
    expect(screen.getByText(/^Each person: £200.00$/)).toBeInTheDocument();
    expect(screen.getByText(/your contribution:/i)).toHaveTextContent('£150.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£50.00');
  });

  it('does not use Member as a name when only email is available', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner: 'user-1',
        members: [{ _id: 'user-2', email: 'richard@example.com' }],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [{
        _id: 'r1',
        type: 'input',
        amount: 150,
        date: '2026-08-27T13:10:00.000Z',
        user: owner
      }]
    );

    renderDetail();

    const section = (await screen.findByRole('heading', { name: 'Who has contributed' })).closest('.card') as HTMLElement;
    const names = Array.from(section.querySelectorAll('strong')).map((el) => el.textContent?.trim());
    expect(names.some((name) => name === 'Member' || name === 'Member (you)')).toBe(false);
    expect(within(section).getByText('richard@example.com')).toBeInTheDocument();
    expect(section.textContent).not.toContain('user-1');
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
  });

  it('counts an accepted member with £0 when calculating share', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [
          member,
          { _id: 'user-3', firstName: 'Jo', lastName: 'Zero', email: 'jo@example.com' }
        ],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      [
        {
          _id: 'r1',
          type: 'input',
          amount: 150,
          date: '2026-01-02T00:00:00.000Z',
          user: 'user-1',
          description: 'First share'
        }
      ]
    );

    renderDetail();

    expect(await screen.findByText(/^Each person: £200.00$/)).toBeInTheDocument();
    expect(screen.getByText(/your contribution:/i)).toHaveTextContent('£150.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£50.00');
  });

  it('does not count pending invitations in the share split', async () => {
    mockAccountFetch(
      {
        _id: 'pot-1',
        name: 'Canada',
        description: 'Trip costs',
        owner,
        members: [member],
        financeRecords: [],
        targetAmount: 600,
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    );

    renderDetail();

    expect(await screen.findByText(/^Each person: £300.00$/)).toBeInTheDocument();
    expect(screen.queryByText(/^Each person: £200.00$/)).not.toBeInTheDocument();
  });

  it('does not invent remaining when there is no contribution target', async () => {
    mockAccountFetch({
      _id: 'pot-1',
      name: 'Canada',
      description: 'Trip costs',
      owner,
      members: [member],
      financeRecords: [],
      createdAt: '2026-01-01T00:00:00.000Z'
    });

    renderDetail();

    expect(await screen.findByText(/no target set/i)).toBeInTheDocument();
    expect(screen.queryByText(/your remaining:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/equal share:/i)).not.toBeInTheDocument();
  });
});
