import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import InviteSharePanel from './InviteSharePanel';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    defaults: { headers: { common: {} } }
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('InviteSharePanel', () => {
  const token = 'c'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    });
    // jsdom has no navigator.share by default — Copy remains the fallback.
    delete (navigator as { share?: unknown }).share;
  });

  it('lets the organiser send an email invite and copy a shareable link', async () => {
    (mockedAxios.post as jest.Mock).mockImplementation((url: string) => {
      if (url === '/invites/send') return Promise.resolve({ data: { _id: 'inv-1' } });
      if (url === '/invites/link') return Promise.resolve({ data: { token } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <InviteSharePanel accountId="pot-1" accountName="Holiday fund" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Invite members' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email invite/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy invite link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share invite' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email invite/i), { target: { value: 'alex@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/invites/send', expect.objectContaining({
        sharedAccountId: 'pot-1',
        recipientEmail: 'alex@example.com'
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/invites/link', { sharedAccountId: 'pot-1' });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/${token}`);
    });
  });

  it('shows Share invite when the browser supports Web Share', async () => {
    (navigator as { share?: unknown }).share = jest.fn().mockResolvedValue(undefined);
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: { token } });

    render(
      <MemoryRouter>
        <InviteSharePanel accountId="pot-1" accountName="Holiday fund" />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Share invite' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Share invite' }));
    await waitFor(() => {
      expect(navigator.share).toHaveBeenCalled();
    });
  });
});
