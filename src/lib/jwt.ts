import 'dotenv/config';
import jwt, { type SignOptions } from 'jsonwebtoken';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }
  return value;
}

const ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
const REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');
const ACCESS_EXPIRES = (process.env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn']) ?? '15m';
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn']) ?? '7d';
const JWT_ISSUER = 'trip-planner';
const JWT_AUDIENCE = 'trip-planner-api';

export interface AccessTokenPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
}

export interface RefreshTokenPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
  sessionVersion: number;
}

export function signAccessToken(userId: string, role: 'USER' | 'ADMIN'): string {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_EXPIRES,
    issuer: JWT_ISSUER,
  });
}

export function signRefreshToken(userId: string, role: 'USER' | 'ADMIN', sessionVersion: number): string {
  return jwt.sign({ sub: userId, role, sessionVersion }, REFRESH_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: REFRESH_EXPIRES,
    issuer: JWT_ISSUER,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET, {
    algorithms: ['HS256'],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET, {
    algorithms: ['HS256'],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  }) as RefreshTokenPayload;
}