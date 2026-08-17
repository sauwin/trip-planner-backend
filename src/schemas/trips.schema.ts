import { z } from 'zod';

export const createTripSchema = z.object({
  title: z.string().min(1, 'title is required'),
  budgetTotal: z.number().positive('budgetTotal must be positive').optional(),
  peopleCount: z.number().int().positive('peopleCount must be a positive integer').optional(),
});

export const addDestinationSchema = z.object({
  destinationId: z.string().uuid('destinationId must be a valid UUID'),
  plannedDate: z.string().datetime().optional(),
  accommodationName: z.string().min(1).optional(),
  accommodationPrice: z.number().positive('accommodationPrice must be positive').optional(),
  accommodationUrl: z.string().url('accommodationUrl must be a valid URL').optional(),
});

export const updateAccommodationSchema = z.object({
  accommodationName: z.string().min(1).optional(),
  accommodationPrice: z.number().positive('accommodationPrice must be positive').optional(),
  accommodationUrl: z.string().url('accommodationUrl must be a valid URL').optional(),
});

export const deleteTripSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});