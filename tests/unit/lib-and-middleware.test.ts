import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../src/middleware/auth.middleware';

vi.mock('../../src/repositories/auth.repository');

import { hashToken } from '../../src/lib/hash';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../../src/lib/jwt';
import { handleServiceError, getErrorCode, getErrorMessage } from '../../src/lib/serviceErrors';
import { requireAuth, requireRole } from '../../src/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../src/middleware/validate';
import { notFoundHandler, errorHandler } from '../../src/middleware/errorHandler.middleware';
import { findUserSession } from '../../src/repositories/auth.repository';

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn(), send: vi.fn(), headersSent: false } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function mockReq(partial: Partial<AuthenticatedRequest> & Record<string, unknown> = {}) {
  return { headers: {}, ...partial } as unknown as AuthenticatedRequest;
}

describe('hashToken', () => {
  it('je deterministický a vracia 64 hex znakov (SHA-256)', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rôzne vstupy dávajú rôzne hash', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('jwt', () => {
  it('access token obsahuje sub a role a dá sa overiť', () => {
    const payload = verifyAccessToken(signAccessToken('u1', 'ADMIN'));
    expect(payload).toMatchObject({ sub: 'u1', role: 'ADMIN' });
  });

  it('refresh token nesie sessionVersion', () => {
    expect(verifyRefreshToken(signRefreshToken('u1', 'USER', 4)).sessionVersion).toBe(4);
  });

  it('access token sa nedá overiť refresh tajomstvom a naopak', () => {
    expect(() => verifyRefreshToken(signAccessToken('u1', 'USER'))).toThrow();
    expect(() => verifyAccessToken(signRefreshToken('u1', 'USER', 0))).toThrow();
  });

  it('odmietne token podpísaný iným tajomstvom', () => {
    const forged = jwt.sign({ sub: 'u1', role: 'SUPER_ADMIN' }, 'iny-secret', {
      algorithm: 'HS256',
      issuer: 'trip-planner',
      audience: 'trip-planner-api',
    });
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('odmietne expirovaný token', () => {
    const expired = jwt.sign({ sub: 'u1', role: 'USER' }, process.env.JWT_ACCESS_SECRET!, {
      algorithm: 'HS256',
      issuer: 'trip-planner',
      audience: 'trip-planner-api',
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).toThrow(/expired/i);
  });

  it('odmietne token s nesprávnym issuer', () => {
    const wrong = jwt.sign({ sub: 'u1', role: 'USER' }, process.env.JWT_ACCESS_SECRET!, {
      algorithm: 'HS256',
      issuer: 'niekto-iny',
      audience: 'trip-planner-api',
    });
    expect(() => verifyAccessToken(wrong)).toThrow();
  });

  it('odmietne token s algoritmom "none"', () => {
    const none = jwt.sign({ sub: 'u1', role: 'USER' }, '', { algorithm: 'none' });
    expect(() => verifyAccessToken(none)).toThrow();
  });
});

describe('serviceErrors', () => {
  it('getErrorMessage / getErrorCode čítajú správu a kód', () => {
    expect(getErrorMessage(new Error('X'))).toBe('X');
    expect(getErrorMessage('str')).toBeUndefined();
    expect(getErrorCode({ code: 'P2002' })).toBe('P2002');
    expect(getErrorCode({})).toBeUndefined();
  });

  it('namapuje známu chybu podľa správy na status a text', () => {
    const res = mockRes();
    handleServiceError(new Error('EMAIL_TAKEN'), res, 'fallback', {
      EMAIL_TAKEN: { status: 409, message: 'Email already registered' },
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
  });

  it('namapuje chybu podľa kódu (napr. Prisma P2002) a pridá code', () => {
    const res = mockRes();
    handleServiceError({ code: 'P2002' }, res, 'fallback', {
      P2002: { status: 409, message: 'Duplicate', code: 'DUP' },
    });
    expect(res.json).toHaveBeenCalledWith({ error: 'Duplicate', code: 'DUP' });
  });

  it('neznáma chyba vráti 500 s fallback textom', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    handleServiceError(new Error('boom'), res, 'Something failed');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something failed' });
  });
});

describe('requireAuth', () => {
  const next = vi.fn() as unknown as NextFunction;

  it('401 bez hlavičky Authorization', async () => {
    const res = mockRes();
    await requireAuth({ headers: {} } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 pre hlavičku bez prefixu Bearer', async () => {
    const res = mockRes();
    await requireAuth({ headers: { authorization: 'Basic abc' } } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('401 pre neplatný token', async () => {
    const res = mockRes();
    await requireAuth({ headers: { authorization: 'Bearer zly.token.tu' } } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('401 pre platne podpísaný token bez platného subject', async () => {
    const malformed = jwt.sign({ role: 'USER' }, process.env.JWT_ACCESS_SECRET!, {
      algorithm: 'HS256',
      issuer: 'trip-planner',
      audience: 'trip-planner-api',
    });
    const res = mockRes();
    await requireAuth({ headers: { authorization: `Bearer ${malformed}` } } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('401, ak sa refresh token použije ako access token', async () => {
    const res = mockRes();
    const token = signRefreshToken('u1', 'USER', 0);
    await requireAuth({ headers: { authorization: `Bearer ${token}` } } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('nastaví userId a userRole a zavolá next pri platnom tokene', async () => {
    const req = mockReq({ headers: { authorization: `Bearer ${signAccessToken('u1', 'ADMIN')}` } });
    await requireAuth(req, mockRes(), next);
    expect(req.userId).toBe('u1');
    expect(req.userRole).toBe('ADMIN');
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  const next = vi.fn() as unknown as NextFunction;
  const asMock = findUserSession as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    asMock.mockResolvedValue({ role: 'USER', sessionVersion: 0 });
  });

  it('401 bez prihláseného používateľa', async () => {
    const res = mockRes();
    await requireRole('ADMIN')({} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('401, ak používateľ už v DB neexistuje', async () => {
    asMock.mockResolvedValue(null);
    const res = mockRes();
    await requireRole('ADMIN')(mockReq({ userId: 'u1' }), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('403 pri nedostatočnej role (rola sa berie z DB, nie z tokenu)', async () => {
    asMock.mockResolvedValue({ role: 'USER', sessionVersion: 0 });
    const res = mockRes();
    await requireRole('SUPER_ADMIN')(mockReq({ userId: 'u1' }), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('prepustí používateľa s povolenou rolou', async () => {
    asMock.mockResolvedValue({ role: 'SUPER_ADMIN', sessionVersion: 0 });
    await requireRole('SUPER_ADMIN')(mockReq({ userId: 'u1' }), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('chybu DB prepošle do next(error)', async () => {
    const err = new Error('db down');
    asMock.mockImplementation(() => {
      throw err;
    });
    const localNext = vi.fn();
    await requireRole('ADMIN')(mockReq({ userId: 'u1' }), mockRes(), localNext as unknown as NextFunction);
    expect(localNext.mock.calls[0][0]).toBe(err);
  });
});

describe('validate middleware', () => {
  const schema = z.object({ n: z.coerce.number().int() });
  const next = vi.fn() as unknown as NextFunction;

  it('validateBody pri chybe vráti 400 s poľom details', () => {
    const res = mockRes();
    validateBody(schema)({ body: { n: 'abc' } } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Validation failed' });
    expect(res.json.mock.calls[0][0].details[0].field).toBe('n');
    expect(next).not.toHaveBeenCalled();
  });

  it('validateBody nahradí req.body sparsovanými dátami', () => {
    const req = { body: { n: '5' } } as Request;
    validateBody(schema)(req, mockRes(), next);
    expect(req.body).toEqual({ n: 5 });
    expect(next).toHaveBeenCalled();
  });

  it('validateQuery uloží výsledok do req.validatedQuery', () => {
    const req = { query: { n: '7' } } as unknown as Request & { validatedQuery?: unknown };
    validateQuery(schema)(req, mockRes(), next);
    expect(req.validatedQuery).toEqual({ n: 7 });
  });
});

describe('errorHandler middleware', () => {
  it('notFoundHandler vráti 404 s metódou a cestou', () => {
    const res = mockRes();
    notFoundHandler({ method: 'GET', path: '/nope' } as Request, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Route GET /nope not found' });
  });

  it('errorHandler vráti 500 bez úniku detailov chyby', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    errorHandler(new Error('tajna chyba'), {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('errorHandler deleguje ďalej, ak hlavičky už boli odoslané', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    (res as { headersSent: boolean }).headersSent = true;
    const next = vi.fn();
    const err = new Error('x');
    errorHandler(err, {} as Request, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});