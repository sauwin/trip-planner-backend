import { recommendationCategoryKeys } from '../data/recommendationCatalog';
import {
  findFeatureCategoriesByIds,
  findPreferencesForUser,
  findRecommendationDestinations,
} from '../repositories/recommendation.repository';

interface DestinationFeatureView {
  featureId: string;
  key: string;
  categoryKey: string;
  weight: number;
}

interface DestinationScore {
  destination: {
    id: string;
    slug: string;
    country: string;
    latitude: number;
    longitude: number;
    translations: unknown;
    popularityScore: number;
    features: DestinationFeatureView[];
  };
  score: number;
}

export interface PaginatedRecommendations {
  items: DestinationScore[];
  total: number;
  limit: number;
  offset: number;
}

export async function getRecommendationsForUser(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  featureIds?: string[]
): Promise<PaginatedRecommendations> {
  const savedPreferences = await findPreferencesForUser(userId);

  if (savedPreferences.length === 0) {
    throw new Error('NO_PREFERENCES');
  }

  const activeCategoryKeys = new Set<string>(recommendationCategoryKeys);
  const activePreferences = savedPreferences.filter(({ category }) => activeCategoryKeys.has(category.key));
  const answeredActiveCategories = new Set(activePreferences.map(({ category }) => category.key));
  if (activePreferences.length > 0 && answeredActiveCategories.size !== recommendationCategoryKeys.length) {
    throw new Error('NO_PREFERENCES');
  }

  const preferences = activePreferences.length > 0 ? activePreferences : savedPreferences;
  const preferencesByCategory = new Map<string, typeof savedPreferences>();
  for (const preference of preferences) {
    const group = preferencesByCategory.get(preference.categoryId) ?? [];
    group.push(preference);
    preferencesByCategory.set(preference.categoryId, group);
  }

  const featureFilterGroups = new Map<string, Set<string>>();
  if (featureIds?.length) {
    const filterFeatures = await findFeatureCategoriesByIds(featureIds);
    const categoryIdByFeatureId = new Map(
      filterFeatures.map(({ id, categoryId }) => [id, categoryId]),
    );
    for (const featureId of featureIds) {
      const categoryId = categoryIdByFeatureId.get(featureId) ?? `unknown:${featureId}`;
      const group = featureFilterGroups.get(categoryId) ?? new Set<string>();
      group.add(featureId);
      featureFilterGroups.set(categoryId, group);
    }
  }

  const destinations = await findRecommendationDestinations();

  const filteredDestinations = featureFilterGroups.size
    ? destinations.filter((destination) =>
        [...featureFilterGroups.values()].every((selectedIds) =>
          destination.features.some((feature) => selectedIds.has(feature.featureId)),
        ),
      )
    : destinations;

  const results = filteredDestinations.map((destination) => {
    let score = 0;
    let maxScore = 0;

    for (const categoryPreferences of preferencesByCategory.values()) {
      const categoryWeight = Math.max(0, categoryPreferences[0].category.defaultWeight);
      maxScore += categoryWeight;
      const bestMatchWeight = categoryPreferences.reduce((bestWeight, preference) => {
        const match = destination.features.find((feature) => feature.featureId === preference.featureId);
        return Math.max(bestWeight, Math.max(0, Math.min(1, match?.weight ?? 0)));
      }, 0);
      score += categoryWeight * bestMatchWeight;
    }

    const normalizedScore = maxScore > 0 ? Math.max(0, Math.min(100, Math.round((score / maxScore) * 100))) : 0;

    const { features, ...destinationData } = destination;
    const featureViews: DestinationFeatureView[] = features.map((f) => ({
      featureId: f.featureId,
      key: f.feature.key,
      categoryKey: f.feature.category.key,
      weight: f.weight,
    }));

    return { destination: { ...destinationData, features: featureViews }, score: normalizedScore };
  });

  const ranked = results
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.destination.slug.localeCompare(b.destination.slug);
    });

  return {
    items: ranked.slice(offset, offset + limit),
    total: ranked.length,
    limit,
    offset,
  };
}