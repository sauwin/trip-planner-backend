import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { findUserSession } from '../repositories/auth.repository';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      (payload.role !== 'USER' && payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN')
    ) {
      throw new Error('Invalid token subject');
    }

    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    try {
      const user = await findUserSession(req.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      req.userRole = user.role;
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ error: 'Insufficient role' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}