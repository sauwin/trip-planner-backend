import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('../../src/repositories/auth.repository');

import {
    registerUser,
    loginUser,
    refreshTokens,
    logoutUser,
    requestPasswordReset,
    resetPassword,
} from '../../src/services/auth.service';
import * as repo from '../../src/repositories/auth.repository';
import { sendPasswordResetEmail } from '../../src/services/email.service';
import { signRefreshToken, verifyAccessToken } from '../../src/lib/jwt';
import { hashToken } from '../../src/lib/hash';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    m(repo.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
    m(repo.createUser).mockImplementation(async (email: string, _h: string, name: string, role: string) => ({
        id: 'u1',
        email,
        name,
        role,
    }));
    m(sendPasswordResetEmail).mockResolvedValue(undefined);
});

describe('registerUser', () => {
    it('vyhodí EMAIL_TAKEN, ak e-mail už existuje', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'x' });
        await expect(registerUser('a@b.sk', 'Heslo123', 'Max')).rejects.toThrow('EMAIL_TAKEN');
        expect(repo.createUser).not.toHaveBeenCalled();
    });

    it('uloží heslo ako bcrypt hash (nie v čistom tvare) a vráti tokeny', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        const tokens = await registerUser('a@b.sk', 'Heslo123', 'Max');

        const savedHash = m(repo.createUser).mock.calls[0][1] as string;
        expect(savedHash).not.toBe('Heslo123');
        expect(await bcrypt.compare('Heslo123', savedHash)).toBe(true);
        expect(verifyAccessToken(tokens.accessToken).sub).toBe('u1');
    });

    it('priradí rolu USER bežnému používateľovi', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        await registerUser('a@b.sk', 'Heslo123', 'Max');
        expect(m(repo.createUser).mock.calls[0][3]).toBe('USER');
    });

    it('priradí SUPER_ADMIN, ak e-mail zodpovedá SUPER_ADMIN_EMAIL', async () => {
        process.env.SUPER_ADMIN_EMAIL = 'Boss@Example.com';
        m(repo.findUserByEmail).mockResolvedValue(null);
        await registerUser('boss@example.com', 'Heslo123', 'Boss');
        expect(m(repo.createUser).mock.calls[0][3]).toBe('SUPER_ADMIN');
        delete process.env.SUPER_ADMIN_EMAIL;
    });
});

describe('loginUser', () => {
    it('vyhodí INVALID_CREDENTIALS pre neexistujúceho používateľa', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        await expect(loginUser('a@b.sk', 'x')).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('vyhodí INVALID_CREDENTIALS pri nesprávnom hesle', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'u1', passwordHash: await bcrypt.hash('Spravne123', 4) });
        await expect(loginUser('a@b.sk', 'Zle12345')).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('vráti pár tokenov pri správnom hesle', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'u1', passwordHash: await bcrypt.hash('Spravne123', 4) });
        const tokens = await loginUser('a@b.sk', 'Spravne123');
        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
    });
});

describe('refreshTokens', () => {
    it('vyhodí INVALID_REFRESH_TOKEN pre nezmyselný token', async () => {
        await expect(refreshTokens('garbage')).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });

    it('odmietne token so zastaranou verziou relácie (po odhlásení)', async () => {
        const token = signRefreshToken('u1', 'USER', 0);
        m(repo.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 1 });
        await expect(refreshTokens(token)).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });

    it('odmietne token neexistujúceho používateľa', async () => {
        const token = signRefreshToken('u1', 'USER', 0);
        m(repo.findUserSession).mockResolvedValue(null);
        await expect(refreshTokens(token)).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });

    it('vydá nové tokeny pre platný refresh token', async () => {
        const token = signRefreshToken('u1', 'USER', 0);
        const tokens = await refreshTokens(token);
        expect(verifyAccessToken(tokens.accessToken)).toMatchObject({ sub: 'u1', role: 'USER' });
    });
});

describe('logoutUser', () => {
    it('zvýši sessionVersion pre platný token', async () => {
        await logoutUser(signRefreshToken('u1', 'USER', 0));
        expect(repo.incrementUserSessionVersion).toHaveBeenCalledWith('u1');
    });

    it('ticho ignoruje neplatný token', async () => {
        await expect(logoutUser('garbage')).resolves.toBeUndefined();
        expect(repo.incrementUserSessionVersion).not.toHaveBeenCalled();
    });
});

describe('requestPasswordReset', () => {
    it('pre neznámy e-mail nič neurobí (neprezradí existenciu účtu)', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        await expect(requestPasswordReset('no@one.sk')).resolves.toBeUndefined();
        expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('uloží do DB len hash tokenu a v e-maile pošle pôvodný token', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'u1', email: 'a@b.sk' });
        await requestPasswordReset('a@b.sk');

        const storedHash = m(repo.replacePasswordResetToken).mock.calls[0][1] as string;
        const link = m(sendPasswordResetEmail).mock.calls[0][1] as string;
        const rawToken = new URL(link).searchParams.get('token')!;

        expect(rawToken).not.toBe(storedHash);
        expect(hashToken(rawToken)).toBe(storedHash);
    });

    it('pri zlyhaní odoslania e-mailu zmaže token a chybu prepošle ďalej', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'u1', email: 'a@b.sk' });
        m(sendPasswordResetEmail).mockRejectedValue(new Error('SMTP down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(requestPasswordReset('a@b.sk')).rejects.toThrow('SMTP down');
        expect(repo.deletePasswordResetToken).toHaveBeenCalled();
    });
});

describe('resetPassword', () => {
    it('pošle do repozitára hash tokenu a bcrypt hash nového hesla', async () => {
        await resetPassword('raw-token', 'Nove12345');
        const [tokenHash, passwordHash] = m(repo.resetPasswordWithToken).mock.calls[0] as [string, string];
        expect(tokenHash).toBe(hashToken('raw-token'));
        expect(await bcrypt.compare('Nove12345', passwordHash)).toBe(true);
    });
});

describe('logoutUser – payload s neplatným sub', () => {
    it('ignoruje platne podpísaný token, ktorého sub nie je string', async () => {
        const token = jwt.sign(
            { sub: 123, role: 'USER', sessionVersion: 0 },
            process.env.JWT_REFRESH_SECRET!,
            {
                algorithm: 'HS256',
                audience: 'trip-planner-api',
                issuer: 'trip-planner',
                expiresIn: '7d',
            },
        );

        await expect(logoutUser(token)).resolves.toBeUndefined();
        expect(repo.incrementUserSessionVersion).not.toHaveBeenCalled();
    });
});

describe('requestPasswordReset – vlastný čas expirácie', () => {
    it('použije predvolených 30 minút, ak je hodnota PASSWORD_RESET_EXPIRES_MIN nulová', async () => {
        vi.stubEnv('PASSWORD_RESET_EXPIRES_MIN', '0');
        vi.resetModules();

        const freshRepo = await import('../../src/repositories/auth.repository');
        const freshEmail = await import('../../src/services/email.service');
        const freshService = await import('../../src/services/auth.service');
        const mock = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

        try {
            mock(freshEmail.sendPasswordResetEmail).mockResolvedValue(undefined);
            mock(freshRepo.findUserByEmail).mockResolvedValue({ id: 'u45', email: 'user@example.com' });
            mock(freshRepo.replacePasswordResetToken).mockResolvedValue(undefined);

            await freshService.requestPasswordReset('user@example.com');

            const expiresAt = mock(freshRepo.replacePasswordResetToken).mock.calls[0][2] as Date;
            expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 60 * 1000);
            expect(expiresAt.getTime()).toBeLessThan(Date.now() + 31 * 60 * 1000);
        } finally {
            vi.unstubAllEnvs();
            vi.resetModules();
        }
    });
});
