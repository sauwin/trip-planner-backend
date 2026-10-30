import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/preferences.repository');

import app from '../../src/app';
import * as repo from '../../src/repositories/preferences.repository';
import { bearer, USER_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const CAT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CAT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FEAT_A1 = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
const FEAT_B1 = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';

const validBody = {
    preferences: [
        { categoryId: CAT_A, featureId: FEAT_A1 },
        { categoryId: CAT_B, featureId: FEAT_B1 },
    ],
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m(repo.findUserId).mockResolvedValue({ id: USER_ID });
    m(repo.findFeaturesByIds).mockResolvedValue([
        { id: FEAT_A1, categoryId: CAT_A },
        { id: FEAT_B1, categoryId: CAT_B },
    ]);
    m(repo.replaceUserPreferences).mockImplementation(async (_userId: string, prefs: unknown[]) => prefs);
    m(repo.findUserPreferences).mockResolvedValue([]);
});

describe('autentifikácia na /api/preferences', () => {
    it.each(['get', 'post'])('%s bez tokenu vráti 401', async (method) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method]('/api/preferences');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/preferences', () => {
    it('uloží preferencie prihláseného používateľa (200)', async () => {
        const res = await request(app).post('/api/preferences').set(bearer()).send(validBody);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(repo.replaceUserPreferences).toHaveBeenCalledWith(USER_ID, validBody.preferences);
    });

    it('overí, že používateľ v DB ešte existuje', async () => {
        await request(app).post('/api/preferences').set(bearer()).send(validBody);
        expect(repo.findUserId).toHaveBeenCalledWith(USER_ID);
    });

    it('401, ak používateľ medzitým zmizol z DB', async () => {
        m(repo.findUserId).mockResolvedValue(null);
        const res = await request(app).post('/api/preferences').set(bearer()).send(validBody);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('User no longer exists. Please log in again.');
        expect(repo.replaceUserPreferences).not.toHaveBeenCalled();
    });

    it('400, ak funkcia nepatrí do uvedenej kategórie', async () => {
        m(repo.findFeaturesByIds).mockResolvedValue([
            { id: FEAT_A1, categoryId: CAT_B },
            { id: FEAT_B1, categoryId: CAT_B },
        ]);
        const res = await request(app).post('/api/preferences').set(bearer()).send(validBody);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Each selected feature must belong to its category');
        expect(repo.replaceUserPreferences).not.toHaveBeenCalled();
    });

    it('400, ak funkcia v DB vôbec neexistuje', async () => {
        m(repo.findFeaturesByIds).mockResolvedValue([{ id: FEAT_A1, categoryId: CAT_A }]);
        const res = await request(app).post('/api/preferences').set(bearer()).send(validBody);

        expect(res.status).toBe(400);
        expect(repo.replaceUserPreferences).not.toHaveBeenCalled();
    });

    it.each([
        ['prázdne pole', { preferences: [] }],
        ['chýbajúce pole preferences', {}],
        ['neplatné UUID kategórie', { preferences: [{ categoryId: 'x', featureId: FEAT_A1 }] }],
        ['neplatné UUID funkcie', { preferences: [{ categoryId: CAT_A, featureId: 'x' }] }],
        ['duplicitný výber', { preferences: [validBody.preferences[0], validBody.preferences[0]] }],
    ])('odmietne: %s (400)', async (_name, body) => {
        const res = await request(app).post('/api/preferences').set(bearer()).send(body);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation failed');
        expect(repo.replaceUserPreferences).not.toHaveBeenCalled();
    });

    it('neznáma chyba DB vráti 500', async () => {
        m(repo.replaceUserPreferences).mockRejectedValue(new Error('tx failed'));
        const res = await request(app).post('/api/preferences').set(bearer()).send(validBody);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to save preferences');
    });
});

describe('GET /api/preferences', () => {
    it('vráti iba preferencie prihláseného používateľa', async () => {
        m(repo.findUserPreferences).mockResolvedValue([{ categoryId: CAT_A, featureId: FEAT_A1 }]);
        const res = await request(app).get('/api/preferences').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(repo.findUserPreferences).toHaveBeenCalledWith(USER_ID);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.findUserPreferences).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/preferences').set(bearer());

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch preferences');
    });
});