import { Response } from 'express';

interface KnownError {
  status: number;
  message: string;
}

export function handleServiceError(
  error: unknown,
  res: Response,
  fallbackMessage: string,
  knownErrors: Record<string, KnownError> = {},
) {
  const messageKey = error instanceof Error ? error.message : undefined;
  const codeKey = (error as { code?: string })?.code;

  const known = (messageKey && knownErrors[messageKey]) || (codeKey && knownErrors[codeKey]);

  if (known) {
    res.status(known.status).json({ error: known.message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: fallbackMessage });
}