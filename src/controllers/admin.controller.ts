import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { changeManagedUserRole, searchManagedUsers } from '../services/admin.service';
import { handleServiceError } from '../lib/serviceErrors';

export async function listManagedUsers(req: Request, res: Response) {
  try {
    const { q } = (req as Request & { validatedQuery: { q?: string } }).validatedQuery;
    const users = await searchManagedUsers(q);
    res.json({ items: users });
  } catch (error) {
    handleServiceError(error, res, 'Failed to search users');
  }
}

export async function updateManagedUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    const user = await changeManagedUserRole(req.userId!, id, req.body.role);
    res.json(user);
  } catch (error) {
    handleServiceError(error, res, 'Failed to update user role', {
      USER_NOT_FOUND: { status: 404, message: 'User not found' },
      CANNOT_CHANGE_SELF: { status: 400, message: 'You cannot change your own role' },
      LAST_SUPER_ADMIN: { status: 400, message: 'Super admin roles cannot be changed here' },
      SUPER_ADMIN_MANAGEMENT_DISABLED: { status: 400, message: 'Super admin roles cannot be changed here' },
    });
  }
}
