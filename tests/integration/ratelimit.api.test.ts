import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/auth.repository');

import app from '../../src/app';
import * as repo from '../../src/repositories/auth.repository';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

describe('ochrana proti brute-force (rate limiting)', () => {
    it('po 10 pokusoch o prihlásenie vráti 429', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);

        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
            const res = await request(app).post('/api/auth/login').send({ email: 'a@b.sk', password: 'Zle12345' });
            statuses.push(res.status);
        }

        expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
        expect(statuses.slice(10)).toEqual([429, 429]);
    });

    it('odpoveď 429 obsahuje zrozumiteľnú chybu a hlavičku Retry-After', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'a@b.sk', password: 'Zle12345' });
        expect(res.status).toBe(429);
        expect(res.body.error).toBe('Too many attempts, please try again later');
        expect(res.headers['retry-after']).toBeDefined();
    });

    it('forgot-password: po 3 žiadostiach pre ten istý e-mail vráti 429', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        const statuses: number[] = [];
        for (let i = 0; i < 4; i++) {
            const res = await request(app).post('/api/auth/forgot-password').send({ email: 'same@b.sk' });
        statuses.push(res.status);
        }
        expect(statuses).toEqual([200, 200, 200, 429]);
    });
});
    it('forgot-password: spracuje aj požiadavku bez e-mailu pred validáciou tela', async () => {
        const res = await request(app).post('/api/auth/forgot-password').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
    });
