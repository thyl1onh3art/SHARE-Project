import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

function mockHomeGets(events: unknown[] = [], finance: unknown[] | Promise<unknown> = []) {
  (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/finance')) {
      if (finance instanceof Promise) {
        return finance;
      }
      return Promise.resolve({ data: finance });
    }
    return Promise.resolve({ data: events });
  });
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe('Home personal overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the personal tracked balance and not the Shared Accounts list', async () => {
    mockHomeGets(
      [{ _id: 'trip-canada', title: 'Canada', tripMoney: { _id: 'pot-1', isDeleted: false } }],
      [
        { type: 'input', amount: 400 },
        { type: 'output', amount: 50 }
      ]
    );

    renderHome();

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
    expect(await screen.findByText('£350.00')).toBeInTheDocument();
    expect(screen.getByText('Prototype balance — no real money is held.')).toBeInTheDocument();
    expect(screen.getByText('Active Shared Accounts: 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Shared Accounts' })).toHaveAttribute('href', '/events');
    expect(screen.queryByRole('button', { name: /create shared account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shared Accounts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Canada' })).not.toBeInTheDocument();
    expect(screen.queryByText(/safeguard|bank account|fscs|stored-value/i)).not.toBeInTheDocument();
  });

  it('shows £0.00 when there are no personal records', async () => {
    mockHomeGets([], []);

    renderHome();

    expect(await screen.findByText('£0.00')).toBeInTheDocument();
    expect(screen.getByText('Your balance')).toBeInTheDocument();
  });

  it('excludes Shared Account rows from the home balance', async () => {
    mockHomeGets([], [
      { type: 'input', amount: 20 },
      { type: 'input', amount: 80, sharedAccount: 'pot-1' },
      { type: 'output', amount: 5 }
    ]);

    renderHome();

    expect(await screen.findByText('£15.00')).toBeInTheDocument();
  });

  it('shows a loading state for the balance without hiding Home', async () => {
    let resolveFinance: (value: { data: unknown[] }) => void = () => undefined;
    const financePromise = new Promise<{ data: unknown[] }>((resolve) => {
      resolveFinance = resolve;
    });
    mockHomeGets([], financePromise);

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
});
