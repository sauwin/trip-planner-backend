import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { saveUserPreferences, getUserPreferences } from '../services/preferences.service';
import { handleServiceError } from '../lib/serviceErrors';

export async function savePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: User ID is missing' });
      return;
    }

    const { preferences } = req.body;
    const saved = await saveUserPreferences(req.userId, preferences);
    res.json(saved);
  } catch (error) {
    handleServiceError(error, res, 'Failed to save preferences', {
      USER_NOT_FOUND: { status: 401, message: 'User no longer exists. Please log in again.' },
      INVALID_PREFERENCES: { status: 400, message: 'Each selected feature must belong to its category' },
    });
  }
}

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const preferences = await getUserPreferences(req.userId!);
    res.json(preferences);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch preferences');
  }
}