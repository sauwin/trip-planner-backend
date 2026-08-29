import { z } from 'zod';

export const createTripSchema = z
  .object({
    title: z.string().min(1, 'title is required'),
    budgetTotal: z.number().positive('budgetTotal must be positive').optional(),
    peopleCount: z.number().int().positive('peopleCount must be a positive integer').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    { message: 'endDate must be on or after startDate', path: ['endDate'] },
  );

export const updateTripSchema = z
  .object({
    title: z.string().min(1, 'title cannot be empty').optional(),
    budgetTotal: z.number().positive('budgetTotal must be positive').optional(),
    peopleCount: z.number().int().positive('peopleCount must be a positive integer').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    { message: 'endDate must be on or after startDate', path: ['endDate'] },
  );

export const addDestinationSchema = z
  .object({
    destinationId: z.string().uuid('destinationId must be a valid UUID'),
    plannedDateStart: z.string().datetime().optional(),
    plannedDateEnd: z.string().datetime().optional(),
    accommodationName: z.string().min(1).optional(),
    accommodationPrice: z.number().positive('accommodationPrice must be positive').optional(),
    accommodationUrl: z.string().url('accommodationUrl must be a valid URL').optional(),
  })
  .refine(
    (data) => !data.plannedDateStart || !data.plannedDateEnd || new Date(data.plannedDateEnd) >= new Date(data.plannedDateStart),
    { message: 'plannedDateEnd must be on or after plannedDateStart', path: ['plannedDateEnd'] },
  );

export const updateTripDestinationDetailsSchema = z
  .object({
    accommodationName: z.string().min(1).optional().nullable(),
    accommodationPrice: z.number().positive('accommodationPrice must be positive').optional().nullable(),
    accommodationUrl: z.string().url('accommodationUrl must be a valid URL').optional().nullable(),
    plannedDateStart: z.string().datetime().optional().nullable(),
    plannedDateEnd: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => !data.plannedDateStart || !data.plannedDateEnd || new Date(data.plannedDateEnd) >= new Date(data.plannedDateStart),
    { message: 'plannedDateEnd must be on or after plannedDateStart', path: ['plannedDateEnd'] },
  );

export const deleteTripSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});