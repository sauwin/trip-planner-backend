import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getRecommendationsForUser } from '../services/recommendation.service';

export async function getRecommendations(req: AuthenticatedRequest, res: Response) {
  try {
    const recommendations = await getRecommendationsForUser(req.userId!);
    res.json(recommendations);
  } catch (error: any) {
    if (error.message === 'NO_PREFERENCES') {
      res.status(400).json({ error: 'Complete the preferences quiz first' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to compute recommendations' });
  }
}