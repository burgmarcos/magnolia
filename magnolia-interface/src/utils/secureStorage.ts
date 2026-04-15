const extractErrorDetail = (message: string) =>
  message.includes(':') ? message.split(':').slice(1).join(':').trim() : message;

export const isMissingSecretError = (error: unknown) => {
  const message = String(error).toLowerCase();

  const hasSecureStorageContext = ['api key', 'keyring', 'credential', 'secure storage'].some((marker) =>
    message.includes(marker)
  );

  if (!hasSecureStorageContext) {
    return false;
  }

  const detail = extractErrorDetail(message);

  const deniedKeywords = ['access denied', 'permission denied', 'not permitted', 'denied by user'];
  if (deniedKeywords.some((keyword) => detail.includes(keyword))) {
    return false;
  }

  const missingKeywords = ['not found', 'no entry', 'no such', 'does not exist', 'item not found', 'credentials not found'];
  return missingKeywords.some((keyword) => detail.includes(keyword));
};
