import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { changeManagedUserRole, searchManagedUsers } from '../services/admin.service';
import { getErrorMessage } from '../lib/serviceErrors';

export async function listManagedUsers(req: Request, res: Response) {
  try {
    const { q } = (req as Request & { validatedQuery: { q?: string } }).validatedQuery;
    const users = await searchManagedUsers(q);
    res.json({ items: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search users' });
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
    const code = getErrorMessage(error);
    if (code === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (code === 'CANNOT_CHANGE_SELF') {
      res.status(400).json({ error: 'You cannot change your own role' });
      return;
    }
    if (code === 'LAST_SUPER_ADMIN' || code === 'SUPER_ADMIN_MANAGEMENT_DISABLED') {
      res.status(400).json({ error: 'Super admin roles cannot be changed here' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
}
