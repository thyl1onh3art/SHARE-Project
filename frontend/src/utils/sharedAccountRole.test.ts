import { currentUserSharedAccountRole } from './sharedAccountRole';

const owner = { _id: 'user-1', firstName: 'Sam' };
const member = { _id: 'user-2', firstName: 'Alex' };

describe('currentUserSharedAccountRole', () => {
  it('returns organiser when the current user owns the account', () => {
    expect(currentUserSharedAccountRole({
      userId: 'user-1',
      owner,
      members: [member]
    })).toBe('organiser');
  });

  it('returns shared when the current user is an accepted member', () => {
    expect(currentUserSharedAccountRole({
      userId: 'user-2',
      owner,
      members: [member]
    })).toBe('shared');
  });

  it('lets organiser win when the owner is also listed in members', () => {
    expect(currentUserSharedAccountRole({
      userId: 'user-1',
      owner,
      members: [owner, member]
    })).toBe('organiser');
  });

  it('does not invent a role for unknown or legacy ownership', () => {
    expect(currentUserSharedAccountRole({
      userId: 'user-1',
      owner: undefined,
      members: []
    })).toBeNull();
    expect(currentUserSharedAccountRole({
      userId: '',
      owner,
      members: [member]
    })).toBeNull();
    expect(currentUserSharedAccountRole({
      userId: 'user-9',
      owner,
      members: [member]
    })).toBeNull();
  });

  it('treats a string owner id the same as a populated owner', () => {
    expect(currentUserSharedAccountRole({
      userId: 'user-1',
      owner: 'user-1',
      members: []
    })).toBe('organiser');
  });

  it('after ownership transfer, the new owner is organiser and the previous owner is shared if still a member', () => {
    const transferred = {
      owner: member,
      members: [owner]
    };
    expect(currentUserSharedAccountRole({ userId: 'user-2', ...transferred })).toBe('organiser');
    expect(currentUserSharedAccountRole({ userId: 'user-1', ...transferred })).toBe('shared');
    expect(currentUserSharedAccountRole({ userId: 'user-1', ...transferred })).not.toBe('organiser');
  });

  it('after ownership transfer, the previous owner gets no badge if they are no longer a member', () => {
    const transferred = {
      owner: member,
      members: []
    };
    expect(currentUserSharedAccountRole({ userId: 'user-2', ...transferred })).toBe('organiser');
    expect(currentUserSharedAccountRole({ userId: 'user-1', ...transferred })).toBeNull();
  });

  it('never returns both organiser and shared for the same user', () => {
    const role = currentUserSharedAccountRole({
      userId: 'user-1',
      owner,
      members: [owner, member]
    });
    expect(role).toBe('organiser');
    expect(role).not.toBe('shared');
  });
});
