import { z } from 'zod';

const reviewPhotoSchema = z
  .string()
  .max(2_800_000, 'Each photo must be 2 MB or smaller')
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]*={0,2}$/, 'Photos must be JPEG, PNG, or WebP images');

export const reviewParamsSchema = z.object({
  reviewId: z.string().uuid('reviewId must be a valid UUID'),
});

export const destinationReviewsParamsSchema = z.object({
  destinationId: z.string().uuid('destinationId must be a valid UUID'),
});

export const destinationReviewsQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(2000),
  photos: z.array(reviewPhotoSchema).max(3),
});

export type DestinationReviewsQuery = z.infer<typeof destinationReviewsQuerySchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
