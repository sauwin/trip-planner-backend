import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

vi.mock('../../src/repositories/auth.repository');

import app from '../../src/app';
import * as repo from '../../src/repositories/auth.repository';
import { sendPasswordResetEmail } from '../../src/services/email.service';
import { signRefreshToken } from '../../src/lib/jwt';
import { bearer, USER_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    m(repo.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
    m(repo.createUser).mockImplementation(async (email: string, _h: string, name: string, role: string) => ({
        id: USER_ID,
        email,
        name,
        role,
    }));
});

describe('POST /api/auth/register', () => {
    it('201 a vráti accessToken + refreshToken', async () => {
        m(repo.findUserByEmail).mockResolvedValue(null);
        const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'Max@Example.com', username: 'Max', password: 'Heslo1234' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(m(repo.findUserByEmail).mock.calls[0][0]).toBe('max@example.com');
    });

    it('409, ak je e-mail už registrovaný', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: 'x' });
        const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'max@example.com', username: 'Max', password: 'Heslo1234' });

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Email already registered');
    });

    it('400 pre slabé heslo, s poľom details', async () => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'max@example.com', username: 'Max', password: 'slabe' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
        expect(res.body.details.some((d: { field: string }) => d.field === 'password')).toBe(true);
    });
});

describe('POST /api/auth/login', () => {
    it('200 s tokenmi pri správnych údajoch', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: USER_ID, passwordHash: await bcrypt.hash('Heslo1234', 4) });
        const res = await request(app).post('/api/auth/login').send({ email: 'max@example.com', password: 'Heslo1234' });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });

    it('401 pri nesprávnom hesle (rovnaká správa ako pri neexistujúcom účte)', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: USER_ID, passwordHash: await bcrypt.hash('Heslo1234', 4) });
        const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'max@example.com', password: 'Zle12345' });

        m(repo.findUserByEmail).mockResolvedValue(null);
        const unknownUser = await request(app).post('/api/auth/login').send({ email: 'none@example.com', password: 'Heslo1234' });

        expect(wrongPassword.status).toBe(401);
        expect(unknownUser.status).toBe(401);
        expect(wrongPassword.body).toEqual(unknownUser.body);
    });

    it('400 pre chýbajúce heslo', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'max@example.com' });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/refresh', () => {
    it('200 a nový pár tokenov pre platný refresh token', async () => {
        const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: signRefreshToken(USER_ID, 'USER', 0) });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeTruthy();
    });

    it('401 pre neplatný refresh token', async () => {
        const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'garbage' });
        expect(res.status).toBe(401);
    });
});

describe('GET /api/auth/me', () => {
    it('401 bez tokenu', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('200 s profilom prihláseného používateľa', async () => {
        m(repo.findUserProfile).mockResolvedValue({ id: USER_ID, email: 'max@example.com', name: 'Max', role: 'USER' });
        const res = await request(app).get('/api/auth/me').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ email: 'max@example.com', role: 'USER' });
        expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('401, ak používateľ už neexistuje', async () => {
        m(repo.findUserProfile).mockResolvedValue(null);
        const res = await request(app).get('/api/auth/me').set(bearer());
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('204 a zneplatní reláciu (sessionVersion + 1)', async () => {
        const res = await request(app).post('/api/auth/logout').send({ refreshToken: signRefreshToken(USER_ID, 'USER', 0) });
        expect(res.status).toBe(204);
        expect(repo.incrementUserSessionVersion).toHaveBeenCalledWith(USER_ID);
    });

    it('400 bez refreshTokenu', async () => {
        const res = await request(app).post('/api/auth/logout').send({});
        expect(res.status).toBe(400);
    });
});

describe('obnovenie hesla', () => {
    it('forgot-password vždy vráti rovnakú odpoveď (neprezradí, či účet existuje)', async () => {
        m(repo.findUserByEmail).mockResolvedValue({ id: USER_ID, email: 'a@b.sk' });
        const existing = await request(app).post('/api/auth/forgot-password').send({ email: 'a@b.sk' });

        m(repo.findUserByEmail).mockResolvedValue(null);
        const missing = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@b.sk' });

        expect(existing.status).toBe(200);
        expect(missing.status).toBe(200);
        expect(existing.body).toEqual(missing.body);
        expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('reset-password vráti 400 pre neplatný alebo expirovaný token', async () => {
        m(repo.resetPasswordWithToken).mockRejectedValue(new Error('INVALID_RESET_TOKEN'));
        const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'bad', newPassword: 'Nove12345' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Reset link is invalid or has expired');
    });

    it('reset-password vráti 200 pri platnom tokene', async () => {
        m(repo.resetPasswordWithToken).mockResolvedValue(undefined);
        const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'good', newPassword: 'Nove12345' });

        expect(res.status).toBe(200);
    });

    it('reset-password vráti 400 pre slabé nové heslo', async () => {
        const res = await request(app).post('/api/auth/reset-password').send({ token: 'x', newPassword: 'slabe' });
        expect(res.status).toBe(400);
    });
});