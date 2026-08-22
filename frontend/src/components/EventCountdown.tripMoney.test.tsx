import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

describe('EventCountdown Trip Money entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Set up Trip Money when a trip has no linked pot', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{ ...baseTrip, tripMoney: null }]
    });

    render(
      <MemoryRouter>
        <EventCountdown />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: /set up trip money/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/shared-accounts?event=trip-canada')
    );
    expect(screen.getByRole('link', { name: /set up trip money/i })).toHaveAttribute(
      'href',
      expect.stringContaining('name=Canada')
    );
  });

  it('opens the linked Trip Money pot when one exists', async () => {
    (mockedAxios.get as jest.Mock).mockResolvedValue({
      data: [{
        ...baseTrip,
        tripMoney: { _id: 'pot-canada', name: 'Canada costs', isDeleted: false }
      }]
    });

    render(
      <MemoryRouter>
        <EventCountdown />
      </MemoryRouter>
    );

    const openLink = await screen.findByRole('link', { name: /open trip money/i });
    expect(openLink).toHaveAttribute('href', '/shared-accounts/pot-canada');
    expect(screen.queryByRole('link', { name: /set up trip money/i })).not.toBeInTheDocument();
  });
});
