export const INVITE_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function isInviteToken(token?: string | null): boolean {
  return typeof token === 'string' && INVITE_TOKEN_PATTERN.test(token);
}

/** Only allow returning to this app's invite page after login/register. */
export function safeInviteReturnTo(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/invite/')) return null;
  if (trimmed.startsWith('//') || trimmed.includes('://') || trimmed.includes('\\')) return null;
  const token = trimmed.slice('/invite/'.length).split(/[/?#]/)[0];
  if (!isInviteToken(token)) return null;
  return `/invite/${token}`;
}

export function invitePath(token: string): string {
  return `/invite/${token}`;
}

export function inviteUrlFromToken(token: string, origin: string = window.location.origin): string {
  return `${String(origin).replace(/\/$/, '')}${invitePath(token)}`;
}

export function buildInviteShareMessage(accountName: string, url: string): string {
  const name = String(accountName || 'Shared Account').trim() || 'Shared Account';
  return `You've been invited to join "${name}" on SHARE.\n\nJoin here:\n${url}`;
}

export function withReturnTo(path: string, returnTo?: string | null): string {
  const safe = safeInviteReturnTo(returnTo);
  if (!safe) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}returnTo=${encodeURIComponent(safe)}`;
}
