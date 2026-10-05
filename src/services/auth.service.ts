import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { hashToken } from '../lib/hash';
import { sendPasswordResetEmail } from './email.service';
import {
  createUser,
  deletePasswordResetToken,
  findUserByEmail,
  findUserSession,
  incrementUserSessionVersion,
  replacePasswordResetToken,
  resetPasswordWithToken,
} from '../repositories/auth.repository';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRES_MIN = Number(process.env.PASSWORD_RESET_EXPIRES_MIN) || 30;
const PASSWORD_RESET_EXPIRES_MS = PASSWORD_RESET_EXPIRES_MIN * 60 * 1000;

export async function registerUser(email: string, password: string) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser(email, passwordHash);

  return issueTokenPair(user.id);
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
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

  if (
    !payload ||
    typeof payload.sub !== 'string' ||
    (payload.role !== 'USER' && payload.role !== 'ADMIN') ||
    !Number.isInteger(payload.sessionVersion) ||
    payload.sessionVersion < 0
  ) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  const user = await findUserSession(payload.sub);

  if (!user || user.sessionVersion !== payload.sessionVersion) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  return {
    accessToken: signAccessToken(payload.sub, user.role),
    refreshToken: signRefreshToken(payload.sub, user.role, user.sessionVersion),
  };
}

export async function logoutUser(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }

  if (!payload || typeof payload.sub !== 'string') return;

  await incrementUserSessionVersion(payload.sub);
}

export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);

  if (!user) return;

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await replacePasswordResetToken(
    user.id,
    tokenHash,
    new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS),
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  try {
    await sendPasswordResetEmail(user.email, resetLink, PASSWORD_RESET_EXPIRES_MIN);
  } catch (error) {
    await deletePasswordResetToken(tokenHash);
    console.error('Password reset email delivery failed', { userId: user.id, error });
    throw error;
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await resetPasswordWithToken(tokenHash, passwordHash);
}

async function issueTokenPair(userId: string) {
  const user = await findUserSession(userId);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const accessToken = signAccessToken(userId, user.role);
  const refreshToken = signRefreshToken(userId, user.role, user.sessionVersion);

  return { accessToken, refreshToken };
}