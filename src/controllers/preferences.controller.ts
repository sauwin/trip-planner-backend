import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { saveUserPreferences, getUserPreferences } from '../services/preferences.service';

export async function savePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized: User ID is missing' });
      return;
    }

    const { preferences } = req.body;
    if (!Array.isArray(preferences) || preferences.length === 0) {
      res.status(400).json({ error: 'preferences must be a non-empty array' });
      return;
    }

    const saved = await saveUserPreferences(req.userId, preferences);
    res.json(saved);
  } catch (error) {
    console.error('Error saving preferences:', error);
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      res.status(401).json({ error: 'User no longer exists. Please log in again.' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_PREFERENCES') {
      res.status(400).json({ error: 'Each selected feature must belong to its category' });
      return;
    }
    res.status(500).json({ error: 'Failed to save preferences' });
  }
}

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const preferences = await getUserPreferences(req.userId!);
    res.json(preferences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
}