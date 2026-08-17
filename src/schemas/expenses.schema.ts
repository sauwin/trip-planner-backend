import { z } from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'description is required'),
  amount: z.number().positive('amount must be positive'),
  date: z.string().datetime().optional(),
});