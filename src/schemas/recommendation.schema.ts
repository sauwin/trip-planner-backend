import { z } from 'zod';

export const listRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;