import { Request, Response, NextFunction } from 'express';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}