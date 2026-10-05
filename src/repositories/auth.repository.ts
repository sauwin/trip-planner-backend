import { prisma } from '../lib/prisma';

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: string, passwordHash: string) {
  return prisma.user.create({ data: { email, passwordHash } });
}

export async function findUserSession(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { role: true, sessionVersion: true },
  });
}

export async function incrementUserSessionVersion(id: string) {
  return prisma.user.update({
    where: { id },
    data: { sessionVersion: { increment: 1 } },
  });
}

export async function replacePasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
) {
  return prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, used: false } }),
    prisma.passwordResetToken.create({ data: { tokenHash, userId, expiresAt } }),
  ]);
}

export async function deletePasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
}

export async function resetPasswordWithToken(tokenHash: string, passwordHash: string) {
  return prisma.$transaction(async (transaction) => {
    const stored = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!stored) throw new Error('INVALID_RESET_TOKEN');

    const now = new Date();
    const consumed = await transaction.passwordResetToken.updateMany({
      where: { id: stored.id, used: false, expiresAt: { gt: now } },
      data: { used: true },
    });
    if (consumed.count !== 1) throw new Error('INVALID_RESET_TOKEN');

    await transaction.user.update({
      where: { id: stored.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  });
}
