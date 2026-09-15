import { personRecordId } from './tripHome';

export type SharedAccountRole = 'organiser' | 'shared';

export function currentUserSharedAccountRole(input: {
  userId?: string | null;
  owner?: unknown;
  members?: unknown[] | null;
}): SharedAccountRole | null {
  const userId = String(input.userId || '').trim();
  if (!userId) return null;

  const ownerId = personRecordId(input.owner);
  if (ownerId && ownerId === userId) return 'organiser';

  const members = Array.isArray(input.members) ? input.members : [];
  const isAcceptedMember = members.some((member) => personRecordId(member) === userId);
  if (isAcceptedMember) return 'shared';

  return null;
}
