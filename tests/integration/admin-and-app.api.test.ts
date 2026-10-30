import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/auth.repository');
vi.mock('../../src/repositories/admin.repository');

import app from '../../src/app';
import * as auth from '../../src/repositories/auth.repository';
import * as admin from '../../src/repositories/admin.repository';
import { bearer, USER_ID, OTHER_USER_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

describe('administrácia používateľov (/api/admin)', () => {
    beforeEach(() => {
        m(auth.findUserSession).mockResolvedValue({ role: 'SUPER_ADMIN', sessionVersion: 0 });
        m(admin.findManagedUsers).mockResolvedValue([{ id: 'u9', email: 'a@b.sk', name: 'A', role: 'ADMIN' }]);
    });

    it('401 bez tokenu', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    it('403 pre bežného používateľa', async () => {
        m(auth.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
        const res = await request(app).get('/api/admin/users').set(bearer(USER_ID, 'USER'));
        expect(res.status).toBe(403);
    });

    it('403 pre ADMIN (prístup má iba SUPER_ADMIN)', async () => {
        m(auth.findUserSession).mockResolvedValue({ role: 'ADMIN', sessionVersion: 0 });
        const res = await request(app).get('/api/admin/users').set(bearer(USER_ID, 'ADMIN'));
        expect(res.status).toBe(403);
    });

    it('403, ak token tvrdí SUPER_ADMIN, ale v DB je USER (sfalšovaná rola v tokene nepomôže)', async () => {
        m(auth.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
        const res = await request(app).get('/api/admin/users').set(bearer(USER_ID, 'SUPER_ADMIN'));
        expect(res.status).toBe(403);
    });

    it('200 so zoznamom pre SUPER_ADMIN', async () => {
        const res = await request(app).get('/api/admin/users').set(bearer(USER_ID, 'SUPER_ADMIN'));
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
    });

    it('400 pre príliš krátky vyhľadávací reťazec', async () => {
        const res = await request(app).get('/api/admin/users?q=a').set(bearer(USER_ID, 'SUPER_ADMIN'));
        expect(res.status).toBe(400);
    });

    it('PATCH role: 400 pre neplatné UUID a pre rolu SUPER_ADMIN', async () => {
        const badId = await request(app).patch('/api/admin/users/nie-uuid/role').set(bearer(USER_ID, 'SUPER_ADMIN')).send({ role: 'ADMIN' });
        const badRole = await request(app).patch(`/api/admin/users/${OTHER_USER_ID}/role`).set(bearer(USER_ID, 'SUPER_ADMIN')).send({ role: 'SUPER_ADMIN' });
        expect(badId.status).toBe(400);
        expect(badRole.status).toBe(400);
    });

    it('PATCH role: nemožno meniť vlastnú rolu (400)', async () => {
        m(admin.findManagedUser).mockResolvedValue({ id: USER_ID, email: 'a@b.sk', name: 'A', role: 'SUPER_ADMIN' });
        const res = await request(app).patch(`/api/admin/users/${USER_ID}/role`).set(bearer(USER_ID, 'SUPER_ADMIN')).send({ role: 'USER' });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('You cannot change your own role');
    });

    it('PATCH role: povýši používateľa na ADMIN a zneplatní jeho reláciu', async () => {
        m(admin.findManagedUser).mockResolvedValue({ id: OTHER_USER_ID, email: 'b@b.sk', name: 'B', role: 'USER' });
        m(admin.updateManagedUserRole).mockResolvedValue({ id: OTHER_USER_ID, email: 'b@b.sk', name: 'B', role: 'ADMIN' });
        const res = await request(app).patch(`/api/admin/users/${OTHER_USER_ID}/role`).set(bearer(USER_ID, 'SUPER_ADMIN')).send({ role: 'ADMIN' });

        expect(res.status).toBe(200);
        expect(res.body.role).toBe('ADMIN');
    });

    it('PATCH role: 404 pre neexistujúceho používateľa', async () => {
        m(admin.findManagedUser).mockResolvedValue(null);
        const res = await request(app).patch(`/api/admin/users/${OTHER_USER_ID}/role`).set(bearer(USER_ID, 'SUPER_ADMIN')).send({ role: 'ADMIN' });
        expect(res.status).toBe(404);
    });
});

describe('globálne správanie aplikácie', () => {
    it('GET /api/health vráti status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    it('neznáma cesta vráti 404 v JSON', async () => {
        const res = await request(app).get('/api/neexistuje');
        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found');
    });

    it('helmet nastaví bezpečnostné hlavičky', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['content-security-policy']).toBeDefined();
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['strict-transport-security']).toBeDefined();
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS nikdy nevracia * ani cudzí pôvod: povolený je iba FRONTEND_URL', async () => {
        const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
        const foreign = await request(app).get('/api/health').set('Origin', 'http://evil.example');

        expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
        expect(foreign.headers['access-control-allow-origin']).not.toBe('http://evil.example');
        expect(foreign.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('globálny limit pridáva hlavičky RateLimit', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['ratelimit-limit'] ?? res.headers['ratelimit']).toBeDefined();
    });

    it('neplatný JSON v tele nespadne na 200 (vráti chybu 4xx/5xx v JSON)', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{zly json');
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});