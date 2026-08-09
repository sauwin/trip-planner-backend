import { z } from 'zod';

export const createTripSchema = z.object({
  title: z.string().min(1, 'title is required'),
});

export const addDestinationSchema = z.object({
  destinationId: z.string().uuid('destinationId must be a valid UUID'),
  plannedDate: z.string().datetime().optional(),
});

export const deleteTripSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});