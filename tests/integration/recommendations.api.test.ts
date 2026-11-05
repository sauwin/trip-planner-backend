import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/recommendation.repository', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/repositories/recommendation.repository')>()),
    findFeatureCategoriesByIds: vi.fn(),
    findInteractionsForUser: vi.fn(),
    findPreferencesForUser: vi.fn(),
    findRecommendationDestinations: vi.fn(),
}));

import app from '../../src/app';
import * as repo from '../../src/repositories/recommendation.repository';
import { bearer } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;
const findInteractionsForUser = (repo as typeof repo & { findInteractionsForUser: (...a: never[]) => unknown }).findInteractionsForUser;

const budget = { id: 'cat-budget', key: 'budget', defaultWeight: 1 };
const destination = (slug: string, weight: number) => ({
    id: slug,
    slug,
    country: 'IT',
    latitude: 0,
    longitude: 0,
    translations: {},
    popularityScore: 0,
    features: [{ featureId: 'f1', weight, feature: { key: 'budget-value', category: { key: 'budget' } } }],
});

beforeEach(() => {
    m(repo.findPreferencesForUser).mockResolvedValue([
        { categoryId: budget.id, featureId: 'f1', category: budget, feature: { id: 'f1', key: 'budget-value' } },
    ]);
    m(repo.findRecommendationDestinations).mockResolvedValue([destination('rome', 1), destination('oslo', 0.5)]);
    m(findInteractionsForUser).mockResolvedValue([]);
});

describe('GET /api/recommendations', () => {
    it('401 bez tokenu', async () => {
        const res = await request(app).get('/api/recommendations');
        expect(res.status).toBe(401);
    });

    it('400 s kódom NO_PREFERENCES, ak používateľ nemá vyplnený kvíz', async () => {
        m(repo.findPreferencesForUser).mockResolvedValue([]);
        const res = await request(app).get('/api/recommendations').set(bearer());

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('NO_PREFERENCES');
    });

    it('200 so zoradeným zoznamom a skóre', async () => {
        const res = await request(app).get('/api/recommendations').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(2);
        expect(res.body.items.map((i: { destination: { slug: string }; score: number }) => [i.destination.slug, i.score])).toEqual([
        ['rome', 100],
        ['oslo', 50],
        ]);
    });

    it('200 s behaviorálnou zložkou: obľúbená destinácia zmení skóre a odpoveď obsahuje behaviorWeight', async () => {
        m(findInteractionsForUser).mockResolvedValue([{ destinationId: 'oslo', type: 'LIKE', value: null }]);
        const res = await request(app).get('/api/recommendations').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.behaviorWeight).toBe(0.1);
        expect(res.body.items.map((i: { destination: { slug: string }; score: number }) => [i.destination.slug, i.score])).toEqual([
        ['rome', 100],
        ['oslo', 55],
        ]);
        expect(res.body.items[1]).toMatchObject({ preferenceScore: 50, behaviorScore: 100 });
    });

    it('rešpektuje query parametre limit a offset', async () => {
        const res = await request(app).get('/api/recommendations?limit=1&offset=1').set(bearer());

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].destination.slug).toBe('oslo');
        expect(res.body).toMatchObject({ limit: 1, offset: 1, total: 2 });
    });

    it('400 pre limit mimo povoleného rozsahu', async () => {
        const res = await request(app).get('/api/recommendations?limit=500').set(bearer());
        expect(res.status).toBe(400);
    });
});