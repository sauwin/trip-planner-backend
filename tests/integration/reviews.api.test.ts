import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/auth.repository');
vi.mock('../../src/repositories/reviews.repository');

import app from '../../src/app';
import * as auth from '../../src/repositories/auth.repository';
import * as repo from '../../src/repositories/reviews.repository';
import { bearer, USER_ID, DEST_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const REVIEW_ID = '66666666-6666-4666-8666-666666666666';
const validReview = { rating: 4, body: 'Krásne mesto', photos: [] as string[] };
const tinyPng = 'data:image/png;base64,iVBORw0KGgo=';

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m(auth.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
    m(repo.findDestinationReviews).mockResolvedValue({ items: [], total: 0 });
    m(repo.createDestinationReview).mockImplementation(async (userId: string, destinationId: string, input: object) => ({
        id: REVIEW_ID,
        userId,
        destinationId,
        ...input,
    }));
    m(repo.updateDestinationReview).mockImplementation(async (userId: string, id: string, input: object) => ({
        id,
        userId,
        ...input,
    }));
    m(repo.deleteDestinationReview).mockResolvedValue(1);
});

describe('autentifikácia na /api/reviews', () => {
    it.each([
        ['get', `/api/reviews/destinations/${DEST_ID}`],
        ['post', `/api/reviews/destinations/${DEST_ID}`],
        ['put', `/api/reviews/${REVIEW_ID}`],
        ['delete', `/api/reviews/${REVIEW_ID}`],
        ['delete', `/api/reviews/${REVIEW_ID}/admin`],
    ])('%s %s bez tokenu vráti 401', async (method, url) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method](url);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/reviews/destinations/:destinationId', () => {
    it('vráti recenzie s predvoleným stránkovaním', async () => {
        m(repo.findDestinationReviews).mockResolvedValue({ items: [{ id: REVIEW_ID }], total: 1 });
        const res = await request(app).get(`/api/reviews/destinations/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(repo.findDestinationReviews).toHaveBeenCalledWith(DEST_ID, USER_ID, 0, 20);
    });

    it('použije offset a limit z dotazu', async () => {
        await request(app).get(`/api/reviews/destinations/${DEST_ID}?offset=10&limit=5`).set(bearer());
        expect(repo.findDestinationReviews).toHaveBeenCalledWith(DEST_ID, USER_ID, 10, 5);
    });

    it.each(['limit=0', 'limit=31', 'offset=-1', 'limit=abc'])('odmietne neplatný dotaz %s (400)', async (qs) => {
        const res = await request(app).get(`/api/reviews/destinations/${DEST_ID}?${qs}`).set(bearer());
        expect(res.status).toBe(400);
    });

    it('odmietne neplatné UUID destinácie (400)', async () => {
        const res = await request(app).get('/api/reviews/destinations/nie-uuid').set(bearer());
        expect(res.status).toBe(400);
        expect(repo.findDestinationReviews).not.toHaveBeenCalled();
    });

    it('chyba DB vráti 500', async () => {
        m(repo.findDestinationReviews).mockRejectedValue(new Error('db down'));
        const res = await request(app).get(`/api/reviews/destinations/${DEST_ID}`).set(bearer());

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch destination reviews');
    });
});

describe('POST /api/reviews/destinations/:destinationId', () => {
    it('vytvorí recenziu prihláseného používateľa (201)', async () => {
        const res = await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send(validReview);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ userId: USER_ID, destinationId: DEST_ID, rating: 4 });
        expect(repo.createDestinationReview).toHaveBeenCalledWith(USER_ID, DEST_ID, validReview);
    });

    it('autor sa berie z tokenu, nie z tela', async () => {
        await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send({ ...validReview, userId: 'cudzi' });
        expect(m(repo.createDestinationReview).mock.calls[0][0]).toBe(USER_ID);
    });

    it('prijme podporovanú fotografiu', async () => {
        const res = await request(app)
            .post(`/api/reviews/destinations/${DEST_ID}`)
            .set(bearer())
            .send({ ...validReview, photos: [tinyPng] });
        expect(res.status).toBe(201);
    });

    it('text sa orezáva o medzery', async () => {
        await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send({ ...validReview, body: '  Super  ' });
        expect(m(repo.createDestinationReview).mock.calls[0][2].body).toBe('Super');
    });

    it.each([
        ['rating 0', { ...validReview, rating: 0 }],
        ['rating 6', { ...validReview, rating: 6 }],
        ['desatinný rating', { ...validReview, rating: 3.5 }],
        ['prázdny text', { ...validReview, body: '' }],
        ['text iba z medzier', { ...validReview, body: '   ' }],
        ['text nad 2000 znakov', { ...validReview, body: 'a'.repeat(2001) }],
        ['chýbajúce photos', { rating: 4, body: 'ok' }],
        ['viac ako 3 fotky', { ...validReview, photos: [tinyPng, tinyPng, tinyPng, tinyPng] }],
        ['fotka vo formáte GIF', { ...validReview, photos: ['data:image/gif;base64,R0lGODlh'] }],
        ['fotka ako URL', { ...validReview, photos: ['https://evil.example/x.png'] }],
        ['fotka s SVG (XSS)', { ...validReview, photos: ['data:image/svg+xml;base64,PHN2Zz4='] }],
    ])('odmietne: %s (400)', async (_name, body) => {
        const res = await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send(body);

        expect(res.status).toBe(400);
        expect(repo.createDestinationReview).not.toHaveBeenCalled();
    });

    it('409, ak používateľ už túto destináciu hodnotil (P2002)', async () => {
        m(repo.createDestinationReview).mockRejectedValue({ code: 'P2002' });
        const res = await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send(validReview);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('You have already reviewed this destination');
    });

    it('404, ak destinácia neexistuje (P2003)', async () => {
        m(repo.createDestinationReview).mockRejectedValue({ code: 'P2003' });
        const res = await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send(validReview);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Destination not found');
    });

    it('neznáma chyba vráti 500', async () => {
        m(repo.createDestinationReview).mockRejectedValue(new Error('boom'));
        const res = await request(app).post(`/api/reviews/destinations/${DEST_ID}`).set(bearer()).send(validReview);
        expect(res.status).toBe(500);
    });
});

describe('PUT /api/reviews/:reviewId', () => {
    it('upraví vlastnú recenziu', async () => {
        const res = await request(app).put(`/api/reviews/${REVIEW_ID}`).set(bearer()).send({ ...validReview, rating: 2 });

        expect(res.status).toBe(200);
        expect(res.body.rating).toBe(2);
        expect(repo.updateDestinationReview).toHaveBeenCalledWith(USER_ID, REVIEW_ID, { ...validReview, rating: 2 });
    });

    it('404, ak recenzia neexistuje alebo patrí inému používateľovi', async () => {
        m(repo.updateDestinationReview).mockResolvedValue(null);
        const res = await request(app).put(`/api/reviews/${REVIEW_ID}`).set(bearer()).send(validReview);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Review not found');
    });

    it('404 aj pri Prisma P2025', async () => {
        m(repo.updateDestinationReview).mockRejectedValue({ code: 'P2025' });
        const res = await request(app).put(`/api/reviews/${REVIEW_ID}`).set(bearer()).send(validReview);
        expect(res.status).toBe(404);
    });

    it('400 pri neplatnom UUID alebo tele', async () => {
        const badId = await request(app).put('/api/reviews/nie-uuid').set(bearer()).send(validReview);
        const badBody = await request(app).put(`/api/reviews/${REVIEW_ID}`).set(bearer()).send({ ...validReview, rating: 9 });

        expect(badId.status).toBe(400);
        expect(badBody.status).toBe(400);
        expect(repo.updateDestinationReview).not.toHaveBeenCalled();
    });

    it('neznáma chyba vráti 500', async () => {
        m(repo.updateDestinationReview).mockRejectedValue(new Error('boom'));
        const res = await request(app).put(`/api/reviews/${REVIEW_ID}`).set(bearer()).send(validReview);
        expect(res.status).toBe(500);
    });
});

describe('DELETE /api/reviews/:reviewId (vlastná recenzia)', () => {
    it('zmaže vlastnú recenziu (204) a pošle userId do repozitára', async () => {
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}`).set(bearer());

        expect(res.status).toBe(204);
        expect(repo.deleteDestinationReview).toHaveBeenCalledWith(REVIEW_ID, USER_ID);
    });

    it('404, ak recenzia nie je používateľova (nezmaže sa ani cudzia)', async () => {
        m(repo.deleteDestinationReview).mockResolvedValue(0);
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}`).set(bearer());

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Review not found');
    });

    it('bežný používateľ nemôže použiť admin endpoint (403)', async () => {
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}/admin`).set(bearer());

        expect(res.status).toBe(403);
        expect(repo.deleteDestinationReview).not.toHaveBeenCalled();
    });

    it('400 pri neplatnom UUID', async () => {
        const res = await request(app).delete('/api/reviews/nie-uuid').set(bearer());
        expect(res.status).toBe(400);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.deleteDestinationReview).mockRejectedValue(new Error('boom'));
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}`).set(bearer());

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to delete review');
    });
});

describe('DELETE /api/reviews/:reviewId/admin (moderácia)', () => {
    beforeEach(() => {
        m(auth.findUserSession).mockResolvedValue({ role: 'ADMIN', sessionVersion: 0 });
    });

    it('ADMIN zmaže ľubovoľnú recenziu (userId sa do repozitára neposiela)', async () => {
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}/admin`).set(bearer(USER_ID, 'ADMIN'));

        expect(res.status).toBe(204);
        expect(repo.deleteDestinationReview).toHaveBeenCalledWith(REVIEW_ID, undefined);
    });

    it('404, ak recenzia neexistuje', async () => {
        m(repo.deleteDestinationReview).mockResolvedValue(0);
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}/admin`).set(bearer(USER_ID, 'ADMIN'));
        expect(res.status).toBe(404);
    });

    it('chyba DB vráti 500', async () => {
        m(repo.deleteDestinationReview).mockRejectedValue(new Error('boom'));
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}/admin`).set(bearer(USER_ID, 'ADMIN'));
        expect(res.status).toBe(500);
    });

    it('403, ak token tvrdí ADMIN, ale v DB je USER', async () => {
        m(auth.findUserSession).mockResolvedValue({ role: 'USER', sessionVersion: 0 });
        const res = await request(app).delete(`/api/reviews/${REVIEW_ID}/admin`).set(bearer(USER_ID, 'ADMIN'));
        expect(res.status).toBe(403);
    });
});