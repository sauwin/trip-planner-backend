import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { UserRole } from '../middleware/auth.middleware';
import { createAdminAuditLog } from './admin-audit.repository';

export async function findManagedUsers(query?: string) {
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      }
    : { role: 'ADMIN' };

  return prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
    take: 50,
  });
}

export async function updateManagedUserRole(actorId: string, id: string, role: Extract<UserRole, 'USER' | 'ADMIN'>) {
  return prisma.$transaction(async (transaction) => {
    const currentUser = await transaction.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    if (currentUser.role === 'SUPER_ADMIN') throw new Error('SUPER_ADMIN_MANAGEMENT_DISABLED');
    if (currentUser.role === role) return currentUser;

    const changed = await transaction.user.updateMany({
      where: { id, role: currentUser.role },
      data: { role, sessionVersion: { increment: 1 } },
    });
    if (!changed.count) {
      return transaction.user.findUniqueOrThrow({
        where: { id },
        select: { id: true, email: true, name: true, role: true },
      });
    }

    const user = await transaction.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, name: true, role: true },
    });
    await createAdminAuditLog(
      transaction,
      actorId,
      role === 'ADMIN' ? 'ADMIN_ADDED' : 'ADMIN_REMOVED',
      user.id,
      user.name || user.email,
    );
    return user;
  });
}

export async function findManagedUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function countSuperAdmins() {
  return prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
}
