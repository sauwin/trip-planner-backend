import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/recommendation.repository');

import { getRecommendationsForUser } from '../../src/services/recommendation.service';
import {
  findFeatureCategoriesByIds,
  findPreferencesForUser,
  findRecommendationDestinations,
} from '../../src/repositories/recommendation.repository';
import {
  recommendationCatalog,
  destinationFeatureProfiles,
  destinationSecondaryFeatureProfiles,
} from '../../src/data/recommendationCatalog';

const asMock = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function buildCatalogDestinations() {
  return Object.keys(destinationFeatureProfiles).map((slug, index) => {
    const primary = destinationFeatureProfiles[slug] || [];
    const secondary = destinationSecondaryFeatureProfiles[slug] || [];
    
    const features: Array<{ featureId: string; weight: number; feature: any }> = [];
    
    for (const f of primary) {
      features.push({
        featureId: f,
        weight: 1.0,
        feature: { key: f, category: { key: 'cat' } },
      });
    }
    for (const f of secondary) {
      features.push({
        featureId: f,
        weight: 0.5,
        feature: { key: f, category: { key: 'cat' } },
      });
    }

    const popularities = [4.9, 4.8, 4.7, 4.6, 4.5, 4.0, 3.8, 3.5];
    const popularityScore = popularities[index % popularities.length];

    return {
      id: `id-${slug}`,
      slug,
      country: 'TestLand',
      latitude: 0,
      longitude: 0,
      translations: { sk: { name: slug } },
      popularityScore,
      features,
    };
  });
}

beforeEach(() => {
  asMock(findFeatureCategoriesByIds).mockResolvedValue([]);
});

describe('Eval: Scenárové overenie na používateľských profiloch (persónach)', () => {
  it('persona so zameraním na zimnú lyžovačku uprednostní Chamonix/Zakopane pred plážovými destináciami', async () => {
    const catalog = buildCatalogDestinations();
    asMock(findRecommendationDestinations).mockResolvedValue(catalog);

    const winterProfile: Record<string, string> = {
      'trip-motivation': 'motivation-adventure',
      'travel-pace': 'pace-balanced',
      'travel-party': 'party-group',
      budget: 'budget-premium',
      'accommodation-style': 'stay-lodge-camp',
      'activity-intensity': 'effort-high',
      'culture-heritage': 'culture-traditions',
      'food-drink': 'food-regional',
      'nature-experiences': 'nature-hiking',
      'getting-around': 'mobility-transit',
      season: 'winter',
      'trip-duration': 'duration-standard',
    };

    const winterPreferences = recommendationCatalog.map((cat) => {
      const featureKey = winterProfile[cat.key];
      return {
        categoryId: cat.key,
        featureId: featureKey,
        category: { id: cat.key, key: cat.key, defaultWeight: 1 },
        feature: { id: featureKey, key: featureKey },
      };
    });

    asMock(findPreferencesForUser).mockResolvedValue(winterPreferences);

    const result = await getRecommendationsForUser('user-persona-1', 5, 0);
    const topSlugs = result.items.map((i) => i.destination.slug);

    const winterDestinations = ['chamonix', 'zakopane', 'whistler', 'interlaken', 'reykjavik'];
    const matchedCount = topSlugs.filter((s) => winterDestinations.includes(s)).length;

    expect(matchedCount).toBeGreaterThanOrEqual(2);
    expect(result.items[0].score).toBeGreaterThan(70);
  });
});

describe('Eval: Overenie korektnosti výpočtu', () => {
  it('vráti najviac 5 položiek so skóre', async () => {
    const catalog = buildCatalogDestinations();
    asMock(findRecommendationDestinations).mockResolvedValue(catalog);

    const standardPreferences = [
      {
        categoryId: 'season',
        featureId: 'summer',
        category: { id: 'season', key: 'season', defaultWeight: 1 },
        feature: { id: 'summer', key: 'summer' },
      },
      {
        categoryId: 'budget',
        featureId: 'budget-mid-range',
        category: { id: 'budget', key: 'budget', defaultWeight: 1 },
        feature: { id: 'budget-mid-range', key: 'budget-mid-range' },
      },
    ];

    asMock(findPreferencesForUser).mockResolvedValue(standardPreferences);

    const result = await getRecommendationsForUser('user-sensitivity', 5, 0);
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result.items[0].score).toBeDefined();
  });
});