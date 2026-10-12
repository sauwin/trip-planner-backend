import { z } from 'zod';

const destinationTranslationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
}).passthrough();

const translationsSchema = z.record(z.string(), destinationTranslationSchema).refine(
  (translations) => Boolean(translations.en && translations.sk),
  'English and Slovak translations are required',
);

const destinationFeaturesSchema = z.array(z.object({
  featureId: z.string().uuid(),
  weight: z.number().min(0).max(1),
})).refine(
  (features) => new Set(features.map(({ featureId }) => featureId)).size === features.length,
  'Destination features must be unique',
);

export const createDestinationSchema = z.object({
  slug: z.string().trim().min(1, 'slug is required').max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  country: z.string().trim().min(1, 'country is required').max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  translations: translationsSchema,
  features: destinationFeaturesSchema,
});

export const updateDestinationSchema = createDestinationSchema;

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

export const searchDestinationsQuerySchema = z.object({
  q: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s'’.-]+$/u),
  limit: z.coerce.number().int().min(1).max(50).optional().default(8),
  locale: z.enum(['en', 'sk']).optional().default('en'),
});

export type ListDestinationsQuery = z.infer<typeof listDestinationsQuerySchema>;
export type SearchDestinationsQuery = z.infer<typeof searchDestinationsQuerySchema>;