const {
  INVITE_TOKEN_BYTES,
  generateInviteToken,
  hashInviteToken,
  isInviteTokenFormatValid,
  buildInviteUrl,
  organiserDisplayName
} = require('../utils/inviteLink');

describe('invite link helpers', () => {
  it('creates a long random token and stores only a hash', () => {
    const raw = generateInviteToken();
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    expect(Buffer.from(raw, 'hex')).toHaveLength(INVITE_TOKEN_BYTES);
    expect(hashInviteToken(raw)).not.toBe(raw);
    expect(hashInviteToken(raw)).toBe(hashInviteToken(raw));
    expect(hashInviteToken(raw)).not.toBe(hashInviteToken(`${raw}x`));
  });

  it('does not treat an account id as a valid invite token', () => {
    expect(isInviteTokenFormatValid('64f0aaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
    expect(isInviteTokenFormatValid('not-a-token')).toBe(false);
    expect(isInviteTokenFormatValid(generateInviteToken())).toBe(true);
  });

  it('builds an invite path from the configured frontend origin', () => {
    const token = generateInviteToken();
    expect(buildInviteUrl(token, 'https://example.test')).toBe(`https://example.test/invite/${token}`);
    expect(buildInviteUrl(token, 'https://example.test/')).toBe(`https://example.test/invite/${token}`);
  });

  it('does not use an email as the organiser display name', () => {
    expect(organiserDisplayName({ firstName: 'Sam', lastName: 'Brown', email: 'sam@example.com' }))
      .toBe('Sam Brown');
    expect(organiserDisplayName({ email: 'hidden@example.com' })).toBe('A member');
  });
});
