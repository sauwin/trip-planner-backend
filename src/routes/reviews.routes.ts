import { Router } from 'express';
import {
  adminDeleteReview,
  createReview,
  deleteOwnReview,
  listDestinationReviews,
  updateReview,
} from '../controllers/reviews.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  destinationReviewsParamsSchema,
  destinationReviewsQuerySchema,
  reviewInputSchema,
  reviewParamsSchema,
} from '../schemas/reviews.schema';

const router = Router();

router.get(
  '/destinations/:destinationId',
  requireAuth,
  validateParams(destinationReviewsParamsSchema),
  validateQuery(destinationReviewsQuerySchema),
  listDestinationReviews,
);
router.post(
  '/destinations/:destinationId',
  requireAuth,
  validateParams(destinationReviewsParamsSchema),
  validateBody(reviewInputSchema),
  createReview,
);
router.put(
  '/:reviewId',
  requireAuth,
  validateParams(reviewParamsSchema),
  validateBody(reviewInputSchema),
  updateReview,
);
router.delete(
  '/:reviewId/admin',
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validateParams(reviewParamsSchema),
  adminDeleteReview,
);
router.delete('/:reviewId', requireAuth, validateParams(reviewParamsSchema), deleteOwnReview);

export default router;
