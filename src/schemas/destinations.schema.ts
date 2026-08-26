import { z } from 'zod';

export const createDestinationSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
  country: z.string().min(1, 'country is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  translations: z.record(z.string(), z.unknown()).optional().default({}),
});

export const deleteDestinationSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

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

export const listDestinationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  country: z.string().min(1).optional(),
  featureIds: featureIdsSchema,
});

export type ListDestinationsQuery = z.infer<typeof listDestinationsQuerySchema>;