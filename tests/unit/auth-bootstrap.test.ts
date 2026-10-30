import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../src/repositories/auth.repository');

import { bootstrapSuperAdmin, getAuthenticatedUser, registerUser, refreshTokens } from '../../src/services/auth.service';
import * as repo from '../../src/repositories/auth.repository';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    delete process.env.SUPER_ADMIN_EMAIL;
});

describe('bootstrapSuperAdmin', () => {
    it('nič neurobí, ak SUPER_ADMIN_EMAIL nie je nastavený', async () => {
        delete process.env.SUPER_ADMIN_EMAIL;
        await expect(bootstrapSuperAdmin()).resolves.toBeUndefined();
        expect(repo.promoteBootstrapUser).not.toHaveBeenCalled();
    });

    it('normalizuje e-mail a povýši bootstrap používateľa', async () => {
        process.env.SUPER_ADMIN_EMAIL = '  ROOT@EXAMPLE.COM  ';
        m(repo.promoteBootstrapUser).mockResolvedValue({ count: 1 });
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        await bootstrapSuperAdmin();

        expect(repo.promoteBootstrapUser).toHaveBeenCalledWith('root@example.com');
        expect(log).toHaveBeenCalledWith('Configured super admin access for root@example.com.');
    });

    it('nevypíše správu, ak sa žiadny používateľ nepovýšil', async () => {
        process.env.SUPER_ADMIN_EMAIL = 'root@example.com';
        m(repo.promoteBootstrapUser).mockResolvedValue({ count: 0 });
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        await bootstrapSuperAdmin();
        expect(log).not.toHaveBeenCalled();
    });
});

describe('ďalšie vetvy auth.service', () => {
    it('vráti null, ak autentifikovaný používateľ neexistuje', async () => {
        m(repo.findUserProfile).mockResolvedValue(null);
        await expect(getAuthenticatedUser('missing')).resolves.toBeNull();
    });

    it('registerUser vyhodí USER_NOT_FOUND, ak sa používateľa nepodarí načítať po vytvorení', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        m(repo.createUser).mockResolvedValue({ id: 'u1' });
        m(repo.findUserSession).mockResolvedValue(null);
        await expect(registerUser('new@example.com', 'Password123', 'Max')).rejects.toThrow('USER_NOT_FOUND');
    });
});

describe('refreshTokens – neplatný payload', () => {
    it('odmietne token s nepovolenou rolou alebo neplatnou verziou relácie', async () => {
        const token = jwt.sign({ sub: 'u1', role: 'ROOT', sessionVersion: -1 }, process.env.JWT_REFRESH_SECRET!, {
            algorithm: 'HS256',
            issuer: 'trip-planner',
            audience: 'trip-planner-api',
        });
        await expect(refreshTokens(token)).rejects.toThrow('INVALID_REFRESH_TOKEN');
        expect(repo.findUserSession).not.toHaveBeenCalled();
    });
});
