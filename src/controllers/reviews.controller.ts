import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  addDestinationReview,
  editDestinationReview,
  getDestinationReviews,
  removeDestinationReview,
} from '../services/reviews.service';
import { DestinationReviewsQuery, ReviewInput } from '../schemas/reviews.schema';
import { handleServiceError } from '../lib/serviceErrors';

export async function listDestinationReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId } = req.params;
    if (typeof destinationId !== 'string') {
      res.status(400).json({ error: 'Invalid destination id' });
      return;
    }
    const { offset, limit } = (req as AuthenticatedRequest & { validatedQuery: DestinationReviewsQuery }).validatedQuery;
    res.json(await getDestinationReviews(destinationId, req.userId!, offset, limit));
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch destination reviews');
  }
}

export async function createReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId } = req.params;
    if (typeof destinationId !== 'string') {
      res.status(400).json({ error: 'Invalid destination id' });
      return;
    }
    const review = await addDestinationReview(req.userId!, destinationId, req.body as ReviewInput);
    res.status(201).json(review);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to create review', {
      P2002: { status: 409, message: 'You have already reviewed this destination' },
      P2003: { status: 404, message: 'Destination not found' },
    });
  }
}

export async function updateReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { reviewId } = req.params;
    if (typeof reviewId !== 'string') {
      res.status(400).json({ error: 'Invalid review id' });
      return;
    }
    const review = await editDestinationReview(req.userId!, reviewId, req.body as ReviewInput);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(review);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to update review', {
      P2025: { status: 404, message: 'Review not found' },
    });
  }
}

export async function deleteOwnReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { reviewId } = req.params;
    if (typeof reviewId !== 'string') {
      res.status(400).json({ error: 'Invalid review id' });
      return;
    }
    const deleted = await removeDestinationReview(reviewId, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete review');
  }
}

export async function adminDeleteReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { reviewId } = req.params;
    if (typeof reviewId !== 'string') {
      res.status(400).json({ error: 'Invalid review id' });
      return;
    }
    const deleted = await removeDestinationReview(reviewId);
    if (!deleted) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete review');
  }
}
