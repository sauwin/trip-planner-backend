import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { hashToken } from '../lib/hash';
import { sendPasswordResetEmail } from './email.service';

const SALT_ROUNDS = 10;
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_MIN = Number(process.env.PASSWORD_RESET_EXPIRES_MIN) || 30;
const PASSWORD_RESET_EXPIRES_MS = PASSWORD_RESET_EXPIRES_MIN * 60 * 1000;

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  return issueTokenPair(user.id);
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  return issueTokenPair(user.id);
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revoked || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const revoked = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revoked: false, expiresAt: { gt: new Date() } },
    data: { revoked: true },
  });

  if (revoked.count !== 1) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  return issueTokenPair(payload.sub);
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return;

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS),
      },
    }),
  ]);

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  try {
    await sendPasswordResetEmail(user.email, resetLink, PASSWORD_RESET_EXPIRES_MIN);
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    console.error('Password reset email delivery failed', { userId: user.id, error });
    throw error;
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const stored = await tx.passwordResetToken.findUnique({ where: { tokenHash } });
    const now = new Date();

    if (!stored) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: stored.id, used: false, expiresAt: { gt: now } },
      data: { used: true },
    });

    if (consumed.count !== 1) {
      throw new Error('INVALID_RESET_TOKEN');
    }

    await tx.user.update({
      where: { id: stored.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revoked: true },
    });
  });
}

async function issueTokenPair(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const accessToken = signAccessToken(userId, user.sessionVersion);
  const refreshToken = signRefreshToken(userId);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  return { accessToken, refreshToken };
}