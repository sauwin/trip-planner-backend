import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getRecommendationsForUser } from '../services/recommendation.service';
import { ListRecommendationsQuery } from '../schemas/recommendation.schema';
import { handleServiceError } from '../lib/serviceErrors';

export async function getRecommendations(req: AuthenticatedRequest, res: Response) {
  try {
    const { limit, offset, featureIds } = (req as AuthenticatedRequest & { validatedQuery: ListRecommendationsQuery }).validatedQuery;
    const recommendations = await getRecommendationsForUser(req.userId!, limit, offset, featureIds);
    res.json(recommendations);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to compute recommendations', {
      NO_PREFERENCES: { status: 400, message: 'Complete the preferences quiz first' },
    });
  }
}