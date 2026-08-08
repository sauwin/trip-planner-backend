import jwt, { type SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'development-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'development-refresh-secret';
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn']) ?? '15m';
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn']) ?? '7d';

export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload;
}