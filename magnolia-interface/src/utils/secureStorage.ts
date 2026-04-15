const MISSING_ERROR_TOKENS = ['not found', 'no entry', 'missing'];
const UNEXPECTED_ERROR_TOKENS = ['access denied', 'permission', 'failed to access native keyring'];

export function isMissingSecureStorageKeyError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  const looksLikeMissing = MISSING_ERROR_TOKENS.some((token) => message.includes(token));
  const looksUnexpected = UNEXPECTED_ERROR_TOKENS.some((token) => message.includes(token));

  return looksLikeMissing && !looksUnexpected;
}
