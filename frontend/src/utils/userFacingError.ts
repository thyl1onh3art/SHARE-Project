export function userFacingError(err: unknown, fallback: string): string {
  const anyErr = err as {
    response?: { data?: { message?: unknown; error?: unknown } };
    message?: unknown;
  };
  const raw = anyErr?.response?.data?.message ?? anyErr?.response?.data?.error;
  const message = typeof raw === 'string' ? raw.trim() : '';

  if (!message) {
    return fallback;
  }

  if (
    /^[[{]/.test(message) ||
    /ObjectId/i.test(message) ||
    /\bmongo\b/i.test(message) ||
    /Cast to ObjectId/i.test(message) ||
    /ECONNREFUSED/i.test(message) ||
    /Request failed with status code/i.test(message)
  ) {
    return fallback;
  }

  if (/shared account not found/i.test(message)) {
    return 'This Trip Money could not be found.';
  }

  return message.replace(/shared account/gi, 'Trip Money');
}
