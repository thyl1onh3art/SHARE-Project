import {
  buildInviteShareMessage,
  inviteUrlFromToken,
  isInviteToken,
  safeInviteReturnTo,
  withReturnTo
} from './inviteLink';

describe('invite link helpers', () => {
  it('accepts only a 64-character hex token in returnTo', () => {
    const token = 'a'.repeat(64);
    expect(safeInviteReturnTo(`/invite/${token}`)).toBe(`/invite/${token}`);
    expect(safeInviteReturnTo('/invite/not-a-token')).toBeNull();
    expect(safeInviteReturnTo('https://evil.example/invite/' + token)).toBeNull();
    expect(safeInviteReturnTo('//evil.example')).toBeNull();
    expect(safeInviteReturnTo('/events')).toBeNull();
    expect(isInviteToken(token)).toBe(true);
    expect(isInviteToken('pot-1')).toBe(false);
  });

  it('builds a share message that includes the link, not a bare token', () => {
    const token = 'b'.repeat(64);
    const url = inviteUrlFromToken(token, 'http://localhost:3001');
    expect(url).toBe(`http://localhost:3001/invite/${token}`);
    const message = buildInviteShareMessage('Holiday fund', url);
    expect(message).toContain('Holiday fund');
    expect(message).toContain(url);
    expect(message.split(url).join('')).not.toContain(token);
    expect(withReturnTo('/login', `/invite/${token}`)).toBe(`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
  });
});
