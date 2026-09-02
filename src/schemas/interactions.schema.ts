import { z } from 'zod';
import { InteractionType } from '../generated/prisma/client';

export const createInteractionSchema = z
  .object({
    destinationId: z.string().uuid('destinationId must be a valid UUID'),
    type: z.nativeEnum(InteractionType),
    value: z.number().int().min(1).max(5).optional(),
  })
  .refine((data) => data.type !== 'RATING' || data.value !== undefined, {
    message: 'value (1-5) is required for RATING interactions',
    path: ['value'],
  });