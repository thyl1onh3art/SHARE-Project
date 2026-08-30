import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const account = {
  _id: 'pot-1',
  name: 'Canada',
  description: 'Trip costs',
  owner,
  members: [member],
  financeRecords: [],
  targetAmount: 2000,
  plannedContributors: 4,
  createdAt: '2026-01-01T00:00:00.000Z'
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/shared-accounts/pot-1']}>
      <Routes>
        <Route path="/shared-accounts/:accountId" element={<SharedAccountDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

const jo = {
  _id: 'user-3',
  firstName: 'Jo',
  lastName: 'Zero',
  email: 'jo@example.com'
};

describe('SharedAccountDetail Pay account', () => {
  let potRecords: Array<Record<string, unknown>>;
  let currentAccount: typeof account;
  let paymentRequests: Array<Record<string, unknown>>;

  beforeEach(() => {
    jest.clearAllMocks();
    potRecords = [];
    currentAccount = { ...account, members: [...account.members] };
    paymentRequests = [];

    (mockedAxios.get as jest.Mock).mockImplementation((url: string) => {
      if (url.startsWith('/shared-accounts/')) {
        return Promise.resolve({ data: currentAccount });
      }
      if (url.startsWith('/finance?sharedAccount=')) {
        return Promise.resolve({ data: potRecords });
      }
      if (url.startsWith('/finance')) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/payment-requests')) {
        return Promise.resolve({ data: paymentRequests });
      }
      if (url.startsWith('/users/')) {
        return Promise.resolve({ data: owner });
      }
      return Promise.resolve({ data: [] });
    });

    (mockedAxios.post as jest.Mock).mockImplementation((url: string, body: Record<string, unknown>) => {
      if (url === '/finance') {
        potRecords = [
          ...potRecords,
          {
            _id: `r-${potRecords.length + 1}`,
            type: body.type,
            amount: body.amount,
            date: body.date || new Date().toISOString(),
            user: {
              _id: 'user-1',
              firstName: 'Sam',
              lastName: 'Brown',
              email: 'sam@example.com'
            },
            description: body.description,
            sharedAccount: body.sharedAccount
          }
        ];
        return Promise.resolve({ data: potRecords[potRecords.length - 1] });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('lets a member with no personal tracked total pay a partial contribution', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);

    expect(await screen.findByRole('heading', { name: 'Pay account' })).toBeInTheDocument();
    expect(screen.getByText(/prototype: this records your contribution for testing/i)).toBeInTheDocument();
    expect(screen.getByText(/your share:/i)).toHaveTextContent('£1000.00');
    expect(screen.getByText(/already contributed:/i)).toHaveTextContent('£0.00');
    expect(screen.getByText(/already contributed:/i)).toHaveTextContent('Remaining: £1000.00');

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '100' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/finance',
      expect.objectContaining({
        type: 'input',
        amount: 100,
        sharedAccount: 'pot-1'
      })
    );

    expect(await screen.findByText(/your contribution:/i)).toHaveTextContent('£100.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£900.00');

    const history = (await screen.findByRole('heading', { name: 'Transaction history' })).closest('.card') as HTMLElement;
    expect(within(history).getByText('Sam Brown')).toBeInTheDocument();
    expect(within(history).getAllByText('Contributed £100.00')).toHaveLength(1);
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/users\//));
    expect(screen.queryByText(/personal tracked total/i)).not.toBeInTheDocument();
  });

  it('identifies the authenticated contributor when history returns a user id', async () => {
    potRecords = [{
      _id: 'r-id-only',
      type: 'input',
      amount: 100,
      date: new Date().toISOString(),
      user: 'user-1',
      description: 'Prototype contribution',
      sharedAccount: 'pot-1'
    }];

    renderDetail();

    const history = (await screen.findByRole('heading', { name: 'Transaction history' })).closest('.card') as HTMLElement;
    expect(within(history).getByText('Sam Brown')).toBeInTheDocument();
    expect(within(history).getByText('Contributed £100.00')).toBeInTheDocument();
    expect(screen.queryByText('Unknown User')).not.toBeInTheDocument();
    expect(mockedAxios.get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/users\//));
  });

  it('lets a member pay their full remaining share', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '1000' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/finance',
        expect.objectContaining({ type: 'input', amount: 1000, sharedAccount: 'pot-1' })
      );
    });

    expect(await screen.findByText(/your contribution:/i)).toHaveTextContent('£1000.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£0.00');
  });

  it('rejects zero and negative amounts without posting', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    const amount = await screen.findByLabelText(/amount/i);

    fireEvent.change(amount, { target: { value: '0' } });
    fireEvent.submit(amount.closest('form') as HTMLFormElement);
    expect((await screen.findAllByText(/greater than 0/i)).length).toBeGreaterThan(0);
    expect(mockedAxios.post).not.toHaveBeenCalled();

    fireEvent.change(amount, { target: { value: '-25' } });
    fireEvent.submit(amount.closest('form') as HTMLFormElement);
    expect(screen.getAllByText(/greater than 0/i).length).toBeGreaterThan(0);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('asks before contributing more than the remaining share', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '1100' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    const dialog = await screen.findByRole('dialog', { name: /contributing more than your share/i });
    expect(within(dialog).getByText(/your remaining share is £1000.00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/take you £100.00 above your suggested share/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('does not submit when the over-share warning is cancelled', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '1100' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    const dialog = await screen.findByRole('dialog', { name: /contributing more than your share/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('dialog', { name: /contributing more than your share/i })).not.toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Pay account' })).toBeInTheDocument();
  });

  it('submits after confirming a contribution above the suggested share', async () => {
    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '1100' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    const dialog = await screen.findByRole('dialog', { name: /contributing more than your share/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /contribute £1100.00 anyway/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/finance',
        expect.objectContaining({ type: 'input', amount: 1100, sharedAccount: 'pot-1' })
      );
    });

    expect(await screen.findByText(/your contribution:/i)).toHaveTextContent('£1100.00');
    expect(screen.getByText(/your remaining:/i)).toHaveTextContent('£0.00');
    expect(screen.getByText(/£100.00 above suggested share/i)).toBeInTheDocument();
  });

  it('warns a fully contributed member before they add more', async () => {
    potRecords = [{
      _id: 'r-full',
      type: 'input',
      amount: 1000,
      date: '2026-08-27T12:00:00.000Z',
      user: owner,
      description: 'Share'
    }];

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '50' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    const dialog = await screen.findByRole('dialog', { name: /already contributed your share/i });
    expect(within(dialog).getByText(/suggested share is £1000.00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/already contributed £1000.00/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/total contribution to £1050.00/i)).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /contribute £50.00 anyway/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/finance',
        expect.objectContaining({ type: 'input', amount: 50, sharedAccount: 'pot-1' })
      );
    });
  });

  it('still blocks a contribution that would exceed the Shared Account target', async () => {
    currentAccount = { ...account, targetAmount: 600, members: [member, jo] };
    potRecords = [{
      _id: 'r-almost',
      type: 'input',
      amount: 580,
      date: '2026-08-27T12:00:00.000Z',
      user: owner,
      description: 'Nearly full'
    }];

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '50' } });
    fireEvent.submit(screen.getByLabelText(/amount/i).closest('form') as HTMLFormElement);

    expect((await screen.findAllByText(/maximum you can record now: £20.00/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('lets the organiser change planned contributors without changing fair share', async () => {
    (mockedAxios.put as jest.Mock).mockResolvedValue({
      data: { ...account, plannedContributors: 6 }
    });

    renderDetail();

    fireEvent.click((await screen.findAllByRole('button', { name: /^pay account$/i }))[0]);
    expect(await screen.findByText(/your share:/i)).toHaveTextContent('£1000.00');

    fireEvent.click(screen.getByRole('button', { name: /edit details/i }));
    expect(screen.getByLabelText(/planned contributors/i)).toHaveValue(4);
    fireEvent.change(screen.getByLabelText(/planned contributors/i), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        '/shared-accounts/pot-1',
        expect.objectContaining({ plannedContributors: 6 })
      );
    });
  });
});
