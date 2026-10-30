import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/auth.repository');
vi.mock('../../src/repositories/destinations.repository');

import app from '../../src/app';
import * as auth from '../../src/repositories/auth.repository';
import * as repo from '../../src/repositories/destinations.repository';
import { bearer, USER_ID, DEST_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const FEATURE_ID = '55555555-5555-4555-8555-555555555555';

function rawDestination(id: string, popularityScore: number) {
    return {
        id,
        slug: `dest-${id}`,
        country: 'Italy',
        popularityScore,
        features: [{ featureId: FEATURE_ID, weight: 0.8, feature: { key: 'beach', category: { key: 'nature' } } }],
    };
}

const validDestination = {
    slug: 'rome',
    country: 'Italy',
    latitude: 41.9,
    longitude: 12.5,
    translations: {
        en: { name: 'Rome', description: 'Eternal city' },
        sk: { name: 'Rím', description: 'Večné mesto' },
    },
    features: [{ featureId: FEATURE_ID, weight: 0.7 }],
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m(auth.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
    m(repo.findDestinations).mockResolvedValue({ items: [], total: 0 });
    m(repo.searchDestinations).mockResolvedValue([]);
    m(repo.findSavedDestinations).mockResolvedValue([]);
    m(repo.findDestinationById).mockResolvedValue(null);
    m(repo.createDestination).mockImplementation(async (d: Record<string, unknown>) => ({ id: DEST_ID, ...d }));
    m(repo.updateDestination).mockImplementation(async (id: string, d: Record<string, unknown>) => ({ id, ...d }));
    m(repo.deleteDestination).mockResolvedValue({ id: DEST_ID });
});

describe('autentifikácia a role na /api/destinations', () => {
    it.each([
        ['get', '/api/destinations'],
        ['get', '/api/destinations/saved'],
        ['get', `/api/destinations/${DEST_ID}`],
        ['post', '/api/destinations'],
        ['put', `/api/destinations/${DEST_ID}`],
        ['delete', `/api/destinations/${DEST_ID}`],
    ])('%s %s bez tokenu vráti 401', async (method, url) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
        expect(res.status).toBe(401);
    });

    it.each([
        ['post', '/api/destinations'],
        ['put', `/api/destinations/${DEST_ID}`],
        ['delete', `/api/destinations/${DEST_ID}`],
    ])('%s %s ako bežný používateľ vráti 403', async (method, url) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url)
            .set(bearer(USER_ID, 'USER'))
            .send(validDestination);
        expect(res.status).toBe(403);
    });

    it('403, ak token tvrdí ADMIN, ale v DB je USER', async () => {
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        expect(res.status).toBe(403);
        expect(repo.createDestination).not.toHaveBeenCalled();
    });
});

describe('GET /api/destinations', () => {
    it('zoradí destinácie podľa popularityScore zostupne a zjednoduší features', async () => {
        m(repo.findDestinations).mockResolvedValue({
            items: [rawDestination('d1', 2.5), rawDestination('d2', 4.8), rawDestination('d3', 3.1)],
            total: 3,
        });
        const res = await request(app).get('/api/destinations').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.items.map((d: { id: string }) => d.id)).toEqual(['d2', 'd3', 'd1']);
        expect(res.body.items[0].features).toEqual([
            { featureId: FEATURE_ID, key: 'beach', categoryKey: 'nature', weight: 0.8 },
        ]);
        expect(res.body).toMatchObject({ total: 3, limit: 20, offset: 0 });
    });

    it('stránkovanie: offset a limit orežú zoradený zoznam', async () => {
        m(repo.findDestinations).mockResolvedValue({
            items: [rawDestination('d1', 1), rawDestination('d2', 4), rawDestination('d3', 3), rawDestination('d4', 2)],
            total: 4,
        });
        const res = await request(app).get('/api/destinations?limit=2&offset=1').set(bearer());

        expect(res.body.items.map((d: { id: string }) => d.id)).toEqual(['d3', 'd4']);
        expect(res.body).toMatchObject({ limit: 2, offset: 1, total: 4 });
    });

    it('filtre country a featureIds sa posielajú do repozitára (featureIds ako pole)', async () => {
        await request(app).get(`/api/destinations?country=Italy&featureIds=${FEATURE_ID}, b ,`).set(bearer());

        expect(repo.findDestinations).toHaveBeenCalledWith({ country: 'Italy', featureIds: [FEATURE_ID, 'b'] });
    });

    it.each(['limit=0', 'limit=101', 'limit=abc', 'offset=-1'])('odmietne neplatný dotaz %s (400)', async (qs) => {
        const res = await request(app).get(`/api/destinations?${qs}`).set(bearer());
        expect(res.status).toBe(400);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.findDestinations).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/destinations').set(bearer());

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch destinations');
    });
});

describe('GET /api/destinations/search (verejné)', () => {
    it('funguje bez tokenu a použije predvolený limit a jazyk', async () => {
        m(repo.searchDestinations).mockResolvedValue([{ id: 'd1', name: 'Rome' }]);
        const res = await request(app).get('/api/destinations/search?q=rom');

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ items: [{ id: 'd1', name: 'Rome' }] });
        expect(repo.searchDestinations).toHaveBeenCalledWith('rom', 8, 'en');
    });

    it('akceptuje slovenčinu a diakritiku', async () => {
        await request(app).get(`/api/destinations/search?${new URLSearchParams({ q: 'Bratislava Žilina', locale: 'sk', limit: '3' })}`);
        expect(repo.searchDestinations).toHaveBeenCalledWith('Bratislava Žilina', 3, 'sk');
    });

    it.each([
        ['príliš krátky reťazec', 'q=a'],
        ['chýbajúci q', 'limit=3'],
        ['nepovolené znaky (SQL/regex)', `q=${encodeURIComponent("rome'; DROP TABLE--%")}`],
        ['neznámy jazyk', 'q=rome&locale=de'],
        ['limit nad 50', 'q=rome&limit=51'],
    ])('odmietne: %s (400)', async (_name, qs) => {
        const res = await request(app).get(`/api/destinations/search?${qs}`);

        expect(res.status).toBe(400);
        expect(repo.searchDestinations).not.toHaveBeenCalled();
    });

    it('chyba DB vráti 500', async () => {
        m(repo.searchDestinations).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/destinations/search?q=rome');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to search destinations');
    });
});

describe('GET /api/destinations/saved a /:id', () => {
    it('/saved vráti uložené destinácie prihláseného používateľa (nie je zamenené s /:id)', async () => {
        m(repo.findSavedDestinations).mockResolvedValue([{ id: 'd1' }]);
        const res = await request(app).get('/api/destinations/saved').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 'd1' }]);
        expect(repo.findSavedDestinations).toHaveBeenCalledWith(USER_ID);
        expect(repo.findDestinationById).not.toHaveBeenCalled();
    });

    it('/saved: chyba DB vráti 500', async () => {
        m(repo.findSavedDestinations).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/destinations/saved').set(bearer());
        expect(res.status).toBe(500);
    });

    it('/:id vráti detail so zjednodušenými features', async () => {
        m(repo.findDestinationById).mockResolvedValue(rawDestination(DEST_ID, 4));
        const res = await request(app).get(`/api/destinations/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(DEST_ID);
        expect(res.body.features[0]).toMatchObject({ key: 'beach', categoryKey: 'nature' });
    });

    it('/:id vráti 404, ak destinácia neexistuje', async () => {
        const res = await request(app).get(`/api/destinations/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Destination not found');
    });

    it('/:id: chyba DB vráti 500', async () => {
        m(repo.findDestinationById).mockRejectedValue(new Error('db down'));
        const res = await request(app).get(`/api/destinations/${DEST_ID}`).set(bearer());
        expect(res.status).toBe(500);
    });
});

describe('správa destinácií (ADMIN / SUPER_ADMIN)', () => {
    beforeEach(() => {
        m(auth.findUserSession).mockResolvedValue({ role: 'ADMIN', sessionVersion: 0 });
    });

    it('POST vytvorí destináciu (201)', async () => {
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ id: DEST_ID, slug: 'rome' });
    });

    it('POST povolí aj SUPER_ADMIN', async () => {
        m(auth.findUserSession).mockResolvedValue({ role: 'SUPER_ADMIN', sessionVersion: 0 });
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'SUPER_ADMIN')).send(validDestination);
        expect(res.status).toBe(201);
    });

    it('POST vráti 409, ak slug už existuje (Prisma P2002)', async () => {
        m(repo.createDestination).mockRejectedValue({ code: 'P2002' });
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Destination with this slug already exists');
    });

    it('POST vráti 400 pri neznámych features', async () => {
        m(repo.createDestination).mockRejectedValue(new Error('INVALID_DESTINATION_FEATURES'));
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Destination contains unknown features');
    });

    it('POST neznáma chyba vráti 500', async () => {
        m(repo.createDestination).mockRejectedValue(new Error('boom'));
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(validDestination);
        expect(res.status).toBe(500);
    });

    it.each([
        ['chýba slovenský preklad', { ...validDestination, translations: { en: validDestination.translations.en } }],
        ['slug s veľkými písmenami', { ...validDestination, slug: 'Rome City' }],
        ['zemepisná šírka mimo rozsahu', { ...validDestination, latitude: 91 }],
        ['zemepisná dĺžka mimo rozsahu', { ...validDestination, longitude: -181 }],
        ['váha feature nad 1', { ...validDestination, features: [{ featureId: FEATURE_ID, weight: 1.5 }] }],
        ['duplicitné features', { ...validDestination, features: [{ featureId: FEATURE_ID, weight: 0.1 }, { featureId: FEATURE_ID, weight: 0.2 }] }],
        ['neplatné UUID feature', { ...validDestination, features: [{ featureId: 'x', weight: 0.5 }] }],
        ['prázdna krajina', { ...validDestination, country: '' }],
    ])('POST odmietne: %s (400)', async (_name, body) => {
        const res = await request(app).post('/api/destinations').set(bearer(USER_ID, 'ADMIN')).send(body);

        expect(res.status).toBe(400);
        expect(repo.createDestination).not.toHaveBeenCalled();
    });

    it('PUT upraví destináciu', async () => {
        const res = await request(app).put(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        expect(res.status).toBe(200);
        expect(repo.updateDestination).toHaveBeenCalledWith(DEST_ID, validDestination);
    });

    it('PUT vráti 404 (P2025), 409 (P2002) a 400 (neznáme features)', async () => {
        const send = () => request(app).put(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN')).send(validDestination);

        m(repo.updateDestination).mockRejectedValueOnce({ code: 'P2025' });
        expect((await send()).status).toBe(404);

        m(repo.updateDestination).mockRejectedValueOnce({ code: 'P2002' });
        expect((await send()).status).toBe(409);

        m(repo.updateDestination).mockRejectedValueOnce(new Error('INVALID_DESTINATION_FEATURES'));
        expect((await send()).status).toBe(400);
    });

    it('PUT neznáma chyba vráti 500', async () => {
        m(repo.updateDestination).mockRejectedValue(new Error('boom'));
        const res = await request(app).put(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN')).send(validDestination);
        expect(res.status).toBe(500);
    });

    it('PUT a DELETE odmietnu neplatné UUID v ceste (400)', async () => {
        const put = await request(app).put('/api/destinations/nie-uuid').set(bearer(USER_ID, 'ADMIN')).send(validDestination);
        const del = await request(app).delete('/api/destinations/nie-uuid').set(bearer(USER_ID, 'ADMIN'));

        expect(put.status).toBe(400);
        expect(del.status).toBe(400);
        expect(repo.updateDestination).not.toHaveBeenCalled();
        expect(repo.deleteDestination).not.toHaveBeenCalled();
    });

    it('DELETE zmaže destináciu (204)', async () => {
        const res = await request(app).delete(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN'));

        expect(res.status).toBe(204);
        expect(repo.deleteDestination).toHaveBeenCalledWith(DEST_ID);
    });

    it('DELETE vráti 404, ak destinácia neexistuje (P2025)', async () => {
        m(repo.deleteDestination).mockRejectedValue({ code: 'P2025' });
        const res = await request(app).delete(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN'));

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Destination not found');
    });

    it('DELETE neznáma chyba vráti 500', async () => {
        m(repo.deleteDestination).mockRejectedValue(new Error('boom'));
        const res = await request(app).delete(`/api/destinations/${DEST_ID}`).set(bearer(USER_ID, 'ADMIN'));
        expect(res.status).toBe(500);
    });
});