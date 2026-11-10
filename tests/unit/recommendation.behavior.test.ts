import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/recommendation.repository', async (importOriginal) => {
    const repository = await importOriginal<typeof import('../../src/repositories/recommendation.repository')>();
    return {
        ...repository,
        findFeatureCategoriesByIds: vi.fn(),
        findInteractionsForUser: vi.fn(),
        findPreferencesForUser: vi.fn(),
        findRecommendationDestinations: vi.fn(),
    };
});

import {
    BEHAVIOR_CONFIG,
    buildBehaviorProfile,
    computeInterestByDestination,
    cosineSimilarity,
    getRecommendationsForUser,
} from '../../src/services/recommendation.service';
import * as recommendationRepository from '../../src/repositories/recommendation.repository';

const {
    findFeatureCategoriesByIds,
    findPreferencesForUser,
    findRecommendationDestinations,
} = recommendationRepository;
const findInteractionsForUser = (recommendationRepository as typeof recommendationRepository & {
    findInteractionsForUser: typeof vi.fn;
}).findInteractionsForUser;

const asMock = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const budget = { id: 'cat-budget', key: 'budget', defaultWeight: 1 };
const season = { id: 'cat-season', key: 'season', defaultWeight: 1 };
const extra = { id: 'cat-extra', key: 'extra', defaultWeight: 1 };

const pref = (category: typeof budget, featureId: string, key: string) => ({
    categoryId: category.id,
    featureId,
    category,
    feature: { id: featureId, key },
});

const dest = (slug: string, features: Array<[string, number]>) => ({
    id: `id-${slug}`,
    slug,
    country: 'XX',
    latitude: 0,
    longitude: 0,
    translations: {},
    popularityScore: 0,
    features: features.map(([featureId, weight]) => ({
        featureId,
        weight,
        feature: { key: featureId, category: { key: extra.key } },
    })),
});

const like = (slug: string) => ({ destinationId: `id-${slug}`, type: 'LIKE', value: null });

const userPreferences = () => [pref(budget, 'f-value', 'f-value'), pref(season, 'f-summer', 'f-summer')];

beforeEach(() => {
    asMock(findPreferencesForUser).mockResolvedValue(userPreferences());
    asMock(findRecommendationDestinations).mockResolvedValue([]);
    asMock(findFeatureCategoriesByIds).mockResolvedValue([]);
    asMock(findInteractionsForUser).mockResolvedValue([]);
});

describe('computeInterestByDestination', () => {
    it('zobrazenia pridávajú záujem po 0,1 a najviac 0,3', () => {
        const views = Array.from({ length: 10 }, () => ({ destinationId: 'a', type: 'VIEW', value: null }));
        expect(computeInterestByDestination(views.slice(0, 2)).get('a')).toBeCloseTo(0.2);
        expect(computeInterestByDestination(views).get('a')).toBeCloseTo(BEHAVIOR_CONFIG.viewCap);
    });

    it('LIKE a SAVE spolu sú orezané na záujem 1', () => {
        const interest = computeInterestByDestination([
            { destinationId: 'a', type: 'LIKE', value: null },
            { destinationId: 'a', type: 'SAVE', value: null },
        ]);
        expect(interest.get('a')).toBe(1);
    });

    it('SAVE samostatne dáva záujem 1', () => {
        const interest = computeInterestByDestination([
            { destinationId: 'a', type: 'SAVE', value: null },
        ]);
        expect(interest.get('a')).toBe(1);
    });

    it('hodnotenie 5 dáva +1, hodnotenie 1 dáva -1 a hodnotenie 3 záujem neovplyvní', () => {
        const interest = computeInterestByDestination([
            { destinationId: 'high', type: 'RATING', value: 5 },
            { destinationId: 'low', type: 'RATING', value: 1 },
            { destinationId: 'neutral', type: 'RATING', value: 3 },
        ]);
        expect(interest.get('high')).toBe(1);
        expect(interest.get('low')).toBe(-1);
        expect(interest.has('neutral')).toBe(false);
    });

    it('ignoruje hodnotenie bez hodnoty a neznáme typy interakcií', () => {
        const interest = computeInterestByDestination([
            { destinationId: 'a', type: 'RATING', value: null },
            { destinationId: 'a', type: 'UNKNOWN', value: 5 },
        ]);
        expect(interest.size).toBe(0);
    });

    it('kladné a záporné signály sa sčítajú', () => {
        const interest = computeInterestByDestination([
            { destinationId: 'a', type: 'LIKE', value: null },
            { destinationId: 'a', type: 'RATING', value: 1 },
        ]);
        expect(interest.has('a')).toBe(false);
    });
});

describe('buildBehaviorProfile a cosineSimilarity', () => {
    it('profil je vážený súčet vektorov destinácií, o ktoré mal používateľ záujem', () => {
        const profile = buildBehaviorProfile(new Map([['a', 1], ['b', 0.5]]), [
            { id: 'a', features: [{ featureId: 'x', weight: 1 }, { featureId: 'y', weight: 0.5 }] },
            { id: 'b', features: [{ featureId: 'x', weight: 1 }] },
            { id: 'c', features: [{ featureId: 'z', weight: 1 }] },
        ]);
        expect(profile.get('x')).toBeCloseTo(1.5);
        expect(profile.get('y')).toBeCloseTo(0.5);
        expect(profile.has('z')).toBe(false);
    });

    it('rovnaké vektory majú podobnosť 1, nesúvisiace 0', () => {
        const profile = new Map([['x', 1], ['y', 0.5]]);
        expect(cosineSimilarity(profile, [{ featureId: 'x', weight: 1 }, { featureId: 'y', weight: 0.5 }])).toBeCloseTo(1);
        expect(cosineSimilarity(profile, [{ featureId: 'z', weight: 1 }])).toBe(0);
    });

    it('záporná podobnosť je -1 a prázdny profil dáva 0', () => {
        expect(cosineSimilarity(new Map([['x', -1]]), [{ featureId: 'x', weight: 1 }])).toBe(-1);
        expect(cosineSimilarity(new Map(), [{ featureId: 'x', weight: 1 }])).toBe(0);
    });
});

describe('getRecommendationsForUser: behaviorálna zložka', () => {
    it('bez interakcií sa skóre rovná skóre preferencií a podiel správania je 0', async () => {
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('perfect', [['f-value', 1], ['f-summer', 1]]),
            dest('half', [['f-value', 1]]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.behaviorWeight).toBe(0);
        expect(result.items.map((i) => [i.destination.slug, i.score, i.preferenceScore, i.behaviorScore])).toEqual([
            ['perfect', 100, 100, 0],
            ['half', 50, 50, 0],
        ]);
    });

    it('destinácia podobná obľúbenej predbehne rovnako vyhovujúcu, ale odlišnú destináciu', async () => {
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('c-liked', [['f-value', 1], ['f-summer', 1], ['f-beach', 1]]),
            dest('b-similar', [['f-value', 1], ['f-summer', 1], ['f-beach', 1]]),
            dest('a-different', [['f-value', 1], ['f-summer', 1], ['f-city', 1]]),
        ]);
        asMock(findInteractionsForUser).mockResolvedValue([like('c-liked')]);

        const result = await getRecommendationsForUser('u1');
        const order = result.items.map((i) => i.destination.slug);

        expect(order.indexOf('b-similar')).toBeLessThan(order.indexOf('a-different'));
        expect(result.items.find((i) => i.destination.slug === 'b-similar')!.score).toBe(100);
        expect(result.items.find((i) => i.destination.slug === 'a-different')!.score).toBe(97);
    });

    it('podiel správania rastie o 0,1 za každú destináciu a je ohraničený hodnotou 0,4', async () => {
        const slugs = ['d1', 'd2', 'd3', 'd4', 'd5'];
        asMock(findRecommendationDestinations).mockResolvedValue(
            slugs.map((slug) => dest(slug, [['f-value', 1], [`f-own-${slug}`, 1]])),
        );

        const weights: number[] = [];
        for (const count of [1, 2, 4, 5]) {
            asMock(findInteractionsForUser).mockResolvedValue(slugs.slice(0, count).map(like));
            weights.push((await getRecommendationsForUser('u1')).behaviorWeight);
        }

        expect(weights).toEqual([0.1, 0.2, 0.4, 0.4]);
    });

    it('preferencie zostávajú dominantné: pri nulovej podobnosti správania je skóre 60 % z plnej zhody', async () => {
        const likedSlugs = ['l1', 'l2', 'l3', 'l4'];
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('target', [['f-value', 1], ['f-summer', 1]]),
            ...likedSlugs.map((slug) => dest(slug, [[`f-own-${slug}`, 1]])),
        ]);
        asMock(findInteractionsForUser).mockResolvedValue(likedSlugs.map(like));

        const result = await getRecommendationsForUser('u1');
        const target = result.items.find((i) => i.destination.slug === 'target')!;

        expect(result.behaviorWeight).toBe(0.4);
        expect(target.preferenceScore).toBe(100);
        expect(target.behaviorScore).toBe(0);
        expect(target.score).toBe(60);
    });

    it('nízke hodnotenie odsunie podobné destinácie (skóre 82 namiesto 100)', async () => {
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('bad', [['f-value', 1], ['f-beach', 1]]),
            dest('similar', [['f-value', 1], ['f-summer', 1], ['f-beach', 1]]),
        ]);

        asMock(findInteractionsForUser).mockResolvedValue([]);
        const baseline = await getRecommendationsForUser('u1');
        const baselineSimilar = baseline.items.find((i) => i.destination.slug === 'similar')!;

        asMock(findInteractionsForUser).mockResolvedValue([{ destinationId: 'id-bad', type: 'RATING', value: 1 }]);

        const result = await getRecommendationsForUser('u1');
        const similar = result.items.find((i) => i.destination.slug === 'similar')!;

        expect(baselineSimilar.score).toBe(100);
        expect(similar.preferenceScore).toBe(100);
        expect(result.behaviorWeight).toBe(0.1);
        expect(similar.behaviorScore).toBe(-82);
        expect(similar.score).toBe(82);
        expect(similar.score).toBeLessThan(baselineSimilar.score);
    });

    it('interakcie s neexistujúcou destináciou sa ignorujú', async () => {
        asMock(findRecommendationDestinations).mockResolvedValue([dest('only', [['f-value', 1], ['f-summer', 1]])]);
        asMock(findInteractionsForUser).mockResolvedValue([like('deleted-destination')]);

        const result = await getRecommendationsForUser('u1');

        expect(result.behaviorWeight).toBe(0);
        expect(result.items[0].score).toBe(100);
    });

    it('profil správania sa počíta zo všetkých destinácií aj pri filtrovaní zoznamu', async () => {
        asMock(findFeatureCategoriesByIds).mockResolvedValue([{ id: 'f-summer', categoryId: season.id }]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('liked-winter', [['f-value', 1], ['f-beach', 1]]),
            dest('summer-beach', [['f-value', 1], ['f-summer', 1], ['f-beach', 1]]),
        ]);
        asMock(findInteractionsForUser).mockResolvedValue([like('liked-winter')]);

        const result = await getRecommendationsForUser('u1', 10, 0, ['f-summer']);

        expect(result.items.map((i) => i.destination.slug)).toEqual(['summer-beach']);
        expect(result.behaviorWeight).toBe(0.1);
        expect(result.items[0].behaviorScore).toBeGreaterThan(0);
    });

    it('všetky skóre sú celé čísla v rozsahu 0 až 100', async () => {
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('a', [['f-value', 1], ['f-summer', 0.5], ['f-beach', 0.3]]),
            dest('b', [['f-value', 0.4], ['f-beach', 1]]),
            dest('c', [['f-summer', 1], ['f-city', 0.7]]),
        ]);
        asMock(findInteractionsForUser).mockResolvedValue([
            like('a'),
            { destinationId: 'id-b', type: 'RATING', value: 2 },
            { destinationId: 'id-c', type: 'VIEW', value: null },
        ]);

        const result = await getRecommendationsForUser('u1');

        for (const item of result.items) {
            for (const value of [item.score, item.preferenceScore]) {
                expect(Number.isInteger(value)).toBe(true);
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(100);
            }
            expect(Number.isInteger(item.behaviorScore)).toBe(true);
            expect(item.behaviorScore).toBeGreaterThanOrEqual(-100);
            expect(item.behaviorScore).toBeLessThanOrEqual(100);
        }
    });
});
