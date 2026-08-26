import { z } from 'zod';

const featureIdsSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return undefined;
    const arr = val
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    return arr.length > 0 ? arr : undefined;
  });

export const listRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  featureIds: featureIdsSchema,
});

export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;