import { Response } from 'express';

interface KnownError {
  status: number;
  message: string;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined;
}

export function getErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

export function handleServiceError(
  error: unknown,
  res: Response,
  fallbackMessage: string,
  knownErrors: Record<string, KnownError> = {},
) {
  const messageKey = getErrorMessage(error);
  const codeKey = getErrorCode(error);

  const known = (messageKey && knownErrors[messageKey]) || (codeKey && knownErrors[codeKey]);

  if (known) {
    res.status(known.status).json({ error: known.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: fallbackMessage });
}