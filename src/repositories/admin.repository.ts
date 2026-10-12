import { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import type { UserRole } from '../middleware/auth.middleware';

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

export async function updateManagedUserRole(id: string, role: Extract<UserRole, 'USER' | 'ADMIN'>) {
  return prisma.user.update({
    where: { id },
    data: { role, sessionVersion: { increment: 1 } },
    select: { id: true, email: true, name: true, role: true },
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
