import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/interactions.repository');

import app from '../../src/app';
import * as repo from '../../src/repositories/interactions.repository';
import { bearer, USER_ID, DEST_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m(repo.replaceInteraction).mockImplementation(async (userId: string, destinationId: string, type: string, value?: number) => ({
        id: 'i1',
        userId,
        destinationId,
        type,
        value: value ?? null,
    }));
    m(repo.createInteraction).mockImplementation(async (userId: string, destinationId: string, type: string, value?: number) => ({
        id: 'i2',
        userId,
        destinationId,
        type,
        value: value ?? null,
    }));
    m(repo.deleteInteractions).mockResolvedValue({ count: 1 });
    m(repo.findUserInteractions).mockResolvedValue([]);
    m(repo.findDestinationInteractions).mockResolvedValue([]);
});

describe('autentifikácia na /api/interactions', () => {
    it.each([
        ['get', '/api/interactions'],
        ['get', `/api/interactions/status/${DEST_ID}`],
        ['post', '/api/interactions'],
        ['delete', `/api/interactions/${DEST_ID}/LIKE`],
    ])('%s %s bez tokenu vráti 401', async (method, url) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
        expect(res.status).toBe(401);
    });
});

describe('POST /api/interactions', () => {
    it.each(['LIKE', 'SAVE'])('%s nahradí predchádzajúcu interakciu (201)', async (type) => {
        const res = await request(app).post('/api/interactions').set(bearer()).send({ destinationId: DEST_ID, type });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ userId: USER_ID, destinationId: DEST_ID, type });
        expect(repo.replaceInteraction).toHaveBeenCalledWith(USER_ID, DEST_ID, type, undefined);
        expect(repo.createInteraction).not.toHaveBeenCalled();
    });

    it('RATING s hodnotou sa uloží cez replaceInteraction', async () => {
        const res = await request(app).post('/api/interactions').set(bearer()).send({ destinationId: DEST_ID, type: 'RATING', value: 4 });

        expect(res.status).toBe(201);
        expect(res.body.value).toBe(4);
        expect(repo.replaceInteraction).toHaveBeenCalledWith(USER_ID, DEST_ID, 'RATING', 4);
    });

    it('VIEW sa len pridá (história zobrazení sa nenahrádza)', async () => {
        const res = await request(app).post('/api/interactions').set(bearer()).send({ destinationId: DEST_ID, type: 'VIEW' });

        expect(res.status).toBe(201);
        expect(repo.createInteraction).toHaveBeenCalledWith(USER_ID, DEST_ID, 'VIEW', undefined);
        expect(repo.replaceInteraction).not.toHaveBeenCalled();
    });

    it('userId sa berie z tokenu, nie z tela požiadavky', async () => {
        await request(app)
            .post('/api/interactions')
            .set(bearer())
            .send({ destinationId: DEST_ID, type: 'LIKE', userId: 'cudzi-pouzivatel' });

        expect(m(repo.replaceInteraction).mock.calls[0][0]).toBe(USER_ID);
    });

    it.each([
        ['neplatné UUID', { destinationId: 'nie-uuid', type: 'LIKE' }],
        ['neznámy typ', { destinationId: DEST_ID, type: 'DISLIKE' }],
        ['chýbajúci typ', { destinationId: DEST_ID }],
        ['RATING bez hodnoty', { destinationId: DEST_ID, type: 'RATING' }],
        ['hodnota nad 5', { destinationId: DEST_ID, type: 'RATING', value: 6 }],
        ['hodnota pod 1', { destinationId: DEST_ID, type: 'RATING', value: 0 }],
        ['desatinná hodnota', { destinationId: DEST_ID, type: 'RATING', value: 3.5 }],
    ])('odmietne: %s (400)', async (_name, body) => {
        const res = await request(app).post('/api/interactions').set(bearer()).send(body);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
        expect(repo.replaceInteraction).not.toHaveBeenCalled();
        expect(repo.createInteraction).not.toHaveBeenCalled();
    });

    it('vráti 404, ak destinácia neexistuje (Prisma P2003)', async () => {
        m(repo.replaceInteraction).mockRejectedValue({ code: 'P2003' });
        const res = await request(app).post('/api/interactions').set(bearer()).send({ destinationId: DEST_ID, type: 'LIKE' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Destination not found');
    });

    it('neznáma chyba DB vráti 500 bez úniku detailov', async () => {
        m(repo.createInteraction).mockRejectedValue(new Error('connection refused'));
        const res = await request(app).post('/api/interactions').set(bearer()).send({ destinationId: DEST_ID, type: 'VIEW' });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to record interaction' });
    });
});

describe('DELETE /api/interactions/:destinationId/:type', () => {
    it.each(['LIKE', 'SAVE', 'RATING'])('zmaže interakciu typu %s (204)', async (type) => {
        const res = await request(app).delete(`/api/interactions/${DEST_ID}/${type}`).set(bearer());

        expect(res.status).toBe(204);
        expect(repo.deleteInteractions).toHaveBeenCalledWith(USER_ID, DEST_ID, type);
    });

    it('VIEW sa zmazať nedá (400)', async () => {
        const res = await request(app).delete(`/api/interactions/${DEST_ID}/VIEW`).set(bearer());

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('This interaction type cannot be removed');
        expect(repo.deleteInteractions).not.toHaveBeenCalled();
    });

    it('neznámy typ vráti 400 s výpisom povolených typov', async () => {
        const res = await request(app).delete(`/api/interactions/${DEST_ID}/DISLIKE`).set(bearer());

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/type must be one of: .*LIKE/);
    });
});

describe('GET /api/interactions', () => {
    it('vráti interakcie prihláseného používateľa', async () => {
        m(repo.findUserInteractions).mockResolvedValue([{ id: 'i1', type: 'LIKE', destinationId: DEST_ID }]);
        const res = await request(app).get('/api/interactions').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(repo.findUserInteractions).toHaveBeenCalledWith(USER_ID);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.findUserInteractions).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/interactions').set(bearer());

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch interactions');
    });
});

describe('GET /api/interactions/status/:destinationId', () => {
    it('bez interakcií vráti predvolený stav', async () => {
        const res = await request(app).get(`/api/interactions/status/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ liked: false, saved: false, rating: null });
    });

    it('poskladá liked, saved a rating z interakcií', async () => {
        m(repo.findDestinationInteractions).mockResolvedValue([
            { type: 'LIKE', value: null },
            { type: 'RATING', value: 5 },
        ]);
        const res = await request(app).get(`/api/interactions/status/${DEST_ID}`).set(bearer());

        expect(res.body).toEqual({ liked: true, saved: false, rating: 5 });
    });

    it('do dotazu posiela iba stavové typy (VIEW sa nezohľadňuje)', async () => {
        await request(app).get(`/api/interactions/status/${DEST_ID}`).set(bearer());

        expect(m(repo.findDestinationInteractions).mock.calls[0][2]).toEqual(['LIKE', 'RATING', 'SAVE']);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.findDestinationInteractions).mockRejectedValue(new Error('db down'));
        const res = await request(app).get(`/api/interactions/status/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(500);
    });
});