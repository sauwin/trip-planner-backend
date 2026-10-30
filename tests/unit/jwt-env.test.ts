import { describe, it, expect, vi } from 'vitest';

describe('jwt – povinné environment premenné', () => {
    it('vyhodí chybu, ak chýba JWT_ACCESS_SECRET', async () => {
        const access = process.env.JWT_ACCESS_SECRET;
        vi.doMock('dotenv/config', () => ({}));
        delete process.env.JWT_ACCESS_SECRET;
        vi.resetModules();

        try {
            await expect(import('../../src/lib/jwt')).rejects.toThrow(
                'Missing required environment variable: JWT_ACCESS_SECRET.',
            );
        } finally {
            vi.doUnmock('dotenv/config');
            if (access === undefined) delete process.env.JWT_ACCESS_SECRET;
            else process.env.JWT_ACCESS_SECRET = access;
        }
    });

    it('vyhodí chybu, ak chýba JWT_REFRESH_SECRET', async () => {
        const access = process.env.JWT_ACCESS_SECRET;
        const refresh = process.env.JWT_REFRESH_SECRET;
        vi.doMock('dotenv/config', () => ({}));
        process.env.JWT_ACCESS_SECRET = 'temporary-access-secret';
        delete process.env.JWT_REFRESH_SECRET;
        vi.resetModules();

        try {
            await expect(import('../../src/lib/jwt')).rejects.toThrow(
                'Missing required environment variable: JWT_REFRESH_SECRET.',
            );
        } finally {
            vi.doUnmock('dotenv/config');
            if (access === undefined) delete process.env.JWT_ACCESS_SECRET;
            else process.env.JWT_ACCESS_SECRET = access;
            if (refresh === undefined) delete process.env.JWT_REFRESH_SECRET;
            else process.env.JWT_REFRESH_SECRET = refresh;
        }
    });


    it('použije predvolené expirácie, ak JWT_*_EXPIRES nie sú nastavené', async () => {
        const access = process.env.JWT_ACCESS_SECRET;
        const refresh = process.env.JWT_REFRESH_SECRET;
        const accessExpires = process.env.JWT_ACCESS_EXPIRES;
        const refreshExpires = process.env.JWT_REFRESH_EXPIRES;

        vi.doMock('dotenv/config', () => ({}));
        process.env.JWT_ACCESS_SECRET = 'temporary-access-secret';
        process.env.JWT_REFRESH_SECRET = 'temporary-refresh-secret';
        delete process.env.JWT_ACCESS_EXPIRES;
        delete process.env.JWT_REFRESH_EXPIRES;
        vi.resetModules();

        try {
            const jwtModule = await import('../../src/lib/jwt');
            const accessToken = jwtModule.signAccessToken('u1', 'USER');
            const refreshToken = jwtModule.signRefreshToken('u1', 'USER', 0);

            expect(jwtModule.verifyAccessToken(accessToken).sub).toBe('u1');
            expect(jwtModule.verifyRefreshToken(refreshToken).sub).toBe('u1');
        } finally {
            vi.doUnmock('dotenv/config');
            if (access === undefined) delete process.env.JWT_ACCESS_SECRET;
            else process.env.JWT_ACCESS_SECRET = access;
            if (refresh === undefined) delete process.env.JWT_REFRESH_SECRET;
            else process.env.JWT_REFRESH_SECRET = refresh;
            if (accessExpires === undefined) delete process.env.JWT_ACCESS_EXPIRES;
            else process.env.JWT_ACCESS_EXPIRES = accessExpires;
            if (refreshExpires === undefined) delete process.env.JWT_REFRESH_EXPIRES;
            else process.env.JWT_REFRESH_EXPIRES = refreshExpires;
            vi.resetModules();
        }
    });
});
