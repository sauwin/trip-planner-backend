import { Router } from 'express';
import { listManagedUsers, updateManagedUser } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const searchUsersSchema = z.object({
  q: z.string().trim().min(2).max(100).optional(),
});
const updateRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});
const userIdSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

router.use(requireAuth, requireRole('SUPER_ADMIN'));
router.get('/users', validateQuery(searchUsersSchema), listManagedUsers);
router.patch('/users/:id/role', validateParams(userIdSchema), validateBody(updateRoleSchema), updateManagedUser);

export default router;
