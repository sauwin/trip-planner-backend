import { findManagedUsers, findManagedUser, updateManagedUserRole, countSuperAdmins } from '../repositories/admin.repository';

export async function searchManagedUsers(query?: string) {
  return findManagedUsers(query);
}

export async function changeManagedUserRole(actorId: string, id: string, role: 'USER' | 'ADMIN') {
  const target = await findManagedUser(id);
  if (!target) throw new Error('USER_NOT_FOUND');

  if (target.id === actorId) {
    throw new Error('CANNOT_CHANGE_SELF');
  }

  if (target.role === 'SUPER_ADMIN') {
    const superAdminCount = await countSuperAdmins();
    if (superAdminCount <= 1) throw new Error('LAST_SUPER_ADMIN');
    throw new Error('SUPER_ADMIN_MANAGEMENT_DISABLED');
  }

  if (target.role === role) return target;
  return updateManagedUserRole(id, role);
}
