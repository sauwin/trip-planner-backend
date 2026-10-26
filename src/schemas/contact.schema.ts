import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(120),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;