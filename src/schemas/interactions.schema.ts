import { z } from 'zod';
import { InteractionType } from '../generated/prisma/client';

export const createInteractionSchema = z.object({
  destinationId: z.string().uuid('destinationId must be a valid UUID'),
  type: z.nativeEnum(InteractionType),
  value: z.number().optional(),
});