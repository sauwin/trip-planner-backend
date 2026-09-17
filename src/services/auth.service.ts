import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { hashToken } from '../lib/hash';
import { sendPasswordResetEmail } from './email.service';

const SALT_ROUNDS = 10;
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_EXPIRES_MS = (Number(process.env.PASSWORD_RESET_EXPIRES_MIN) || 30) * 60 * 1000;

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

  // Навмисно НЕ кидаємо помилку, якщо користувача не знайдено, і не
  // повертаємо нічого, що відрізнялось б від "успіху". Інакше зловмисник
  // міг би перебирати email-адреси і за різницею у відповіді дізнаватись,
  // які з них зареєстровані в системі (user enumeration attack).
  if (!user) return;

  const rawToken = randomBytes(32).toString('hex');

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS),
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, resetLink);
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.used || stored.expiresAt < new Date()) {
    throw new Error('INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { used: true } }),
    // Відкликаємо ВСІ refresh-токени користувача: якщо пароль скидали
    // через компрометацію акаунта, будь-яка стара сесія (в т.ч. зловмисника)
    // одразу перестає працювати і доведеться заново логінитись новим паролем.
    prisma.refreshToken.updateMany({ where: { userId: stored.userId }, data: { revoked: true } }),
  ]);
}

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
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