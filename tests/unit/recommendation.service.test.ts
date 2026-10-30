import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/recommendation.repository');

import { getRecommendationsForUser } from '../../src/services/recommendation.service';
import {
    findPreferencesForUser,
    findRecommendationDestinations,
    findFeatureCategoriesByIds,
} from '../../src/repositories/recommendation.repository';

const budget = { id: 'cat-budget', key: 'budget', defaultWeight: 1 };
const season = { id: 'cat-season', key: 'season', defaultWeight: 1 };

const pref = (category: typeof budget, featureId: string, key: string) => ({
    categoryId: category.id,
    featureId,
    category,
    feature: { id: featureId, key },
});

const dest = (slug: string, features: Array<{ id: string; key: string; cat: typeof budget; weight: number }>) => ({
    id: `id-${slug}`,
    slug,
    country: 'XX',
    latitude: 0,
    longitude: 0,
    translations: {},
    popularityScore: 0,
    features: features.map((f) => ({
        featureId: f.id,
        weight: f.weight,
        feature: { key: f.key, category: { key: f.cat.key } },
    })),
});

const asMock = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    asMock(findPreferencesForUser).mockResolvedValue([]);
    asMock(findRecommendationDestinations).mockResolvedValue([]);
    asMock(findFeatureCategoriesByIds).mockResolvedValue([]);
});

describe('getRecommendationsForUser', () => {
    it('vyhodí NO_PREFERENCES, ak používateľ nevyplnil kvíz', async () => {
        await expect(getRecommendationsForUser('u1')).rejects.toThrow('NO_PREFERENCES');
    });

    it('vypočíta skóre 100 pri úplnej zhode vo všetkých kategóriách', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([
            pref(budget, 'f-budget-value', 'budget-value'),
            pref(season, 'f-summer', 'summer'),
        ]);
        asMock(findRecommendationDestinations).mockResolvedValue([
        dest('perfect', [
            { id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 },
            { id: 'f-summer', key: 'summer', cat: season, weight: 1 },
        ]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.total).toBe(1);
        expect(result.items[0].score).toBe(100);
        expect(result.items[0].matchedFeatures).toEqual(['budget-value', 'summer']);
    });

    it('vypočíta čiastočnú zhodu ako vážený priemer (50 %)', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([
            pref(budget, 'f-budget-value', 'budget-value'),
            pref(season, 'f-summer', 'summer'),
        ]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('half', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items[0].score).toBe(50);
        expect(result.items[0].matchedFeatures).toEqual(['budget-value']);
    });

    it('použije váhu vlastnosti destinácie (weight 0.5 => 50)', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('weak', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 0.5 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items[0].score).toBe(50);
    });

    it('vynechá destinácie so skóre 0', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('nomatch', [{ id: 'f-other', key: 'budget-premium', cat: budget, weight: 1 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.total).toBe(0);
        expect(result.items).toEqual([]);
    });

    it('zoradí zostupne podľa skóre a pri rovnosti podľa slug', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        const match = [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }];
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('zebra', match),
            dest('alpha', match),
            dest('medium', [{ ...match[0], weight: 0.6 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items.map((i) => i.destination.slug)).toEqual(['alpha', 'zebra', 'medium']);
    });

    it('pri viacerých vybraných vlastnostiach v kategórii berie tú najlepšiu', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([
            pref(season, 'f-summer', 'summer'),
            pref(season, 'f-winter', 'winter'),
        ]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('ski', [{ id: 'f-winter', key: 'winter', cat: season, weight: 0.8 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items[0].score).toBe(80);
        expect(result.items[0].matchedFeatures).toEqual(['winter']);
    });

    it('ohraničí váhu vlastnosti do intervalu 0 až 1 (weight 5 => 100)', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('overweight', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 5 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items[0].score).toBe(100);
    });

    it('aplikuje filter featureIds: ostanú len destinácie s danou vlastnosťou', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findFeatureCategoriesByIds).mockResolvedValue([{ id: 'f-summer', categoryId: season.id }]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('with-summer', [
                { id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 },
                { id: 'f-summer', key: 'summer', cat: season, weight: 1 },
            ]),
            dest('without-summer', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }]),
        ]);

        const result = await getRecommendationsForUser('u1', 10, 0, ['f-summer']);

        expect(result.items.map((i) => i.destination.slug)).toEqual(['with-summer']);
    });

    it('podporí stránkovanie (limit a offset) a vráti celkový počet', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        const match = [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }];
        asMock(findRecommendationDestinations).mockResolvedValue(['a', 'b', 'c', 'd'].map((s) => dest(s, match)));

        const result = await getRecommendationsForUser('u1', 2, 1);

        expect(result.total).toBe(4);
        expect(result.limit).toBe(2);
        expect(result.offset).toBe(1);
        expect(result.items.map((i) => i.destination.slug)).toEqual(['b', 'c']);
    });

    it('do odpovede pridá zjednodušený zoznam vlastností destinácie', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('x', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }]),
        ]);

        const result = await getRecommendationsForUser('u1');

        expect(result.items[0].destination.features).toEqual([
            { featureId: 'f-budget-value', key: 'budget-value', categoryKey: 'budget', weight: 1 },
        ]);
    });
});
describe('getRecommendationsForUser – vetvy okrajových prípadov', () => {
    it('použije uložené preferencie aj vtedy, keď kategória už nie je v katalógu', async () => {
        const legacyCategory = { id: 'legacy-category', key: 'legacy', defaultWeight: 1 };
        asMock(findPreferencesForUser).mockResolvedValue([
            pref(legacyCategory as typeof budget, 'legacy-feature', 'legacy-feature'),
        ]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('legacy-destination', [{
                id: 'legacy-feature',
                key: 'legacy-feature',
                cat: legacyCategory as typeof budget,
                weight: 1,
            }]),
        ]);

        const result = await getRecommendationsForUser('u1');
        expect(result.items[0].destination.slug).toBe('legacy-destination');
        expect(result.items[0].score).toBe(100);
    });

    it('zaradí neznámu filtrovanú vlastnosť do samostatnej skupiny', async () => {
        asMock(findPreferencesForUser).mockResolvedValue([pref(budget, 'f-budget-value', 'budget-value')]);
        asMock(findFeatureCategoriesByIds).mockResolvedValue([]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('destination', [{ id: 'f-budget-value', key: 'budget-value', cat: budget, weight: 1 }]),
        ]);

        const result = await getRecommendationsForUser('u1', 10, 0, ['unknown-feature']);
        expect(result.items).toEqual([]);
        expect(findFeatureCategoriesByIds).toHaveBeenCalledWith(['unknown-feature']);
    });

    it('vráti skóre 0, ak kategória nemá kladnú predvolenú váhu', async () => {
        const zeroWeightCategory = { id: 'zero-category', key: 'budget', defaultWeight: 0 };
        asMock(findPreferencesForUser).mockResolvedValue([
            pref(zeroWeightCategory as typeof budget, 'f-zero', 'zero-feature'),
        ]);
        asMock(findRecommendationDestinations).mockResolvedValue([
            dest('zero-score', [{
                id: 'f-zero',
                key: 'zero-feature',
                cat: zeroWeightCategory as typeof budget,
                weight: 1,
            }]),
        ]);

        const result = await getRecommendationsForUser('u1');
        expect(result.total).toBe(0);
        expect(result.items).toEqual([]);
    });
});
