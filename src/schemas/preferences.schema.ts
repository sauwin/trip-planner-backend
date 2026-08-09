import { z } from 'zod';

export const savePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        categoryId: z.string().uuid('categoryId must be a valid UUID'),
        featureId: z.string().uuid('featureId must be a valid UUID'),
      }),
    )
    .min(1, 'preferences must be a non-empty array'),
});