import { recommendationCategoryKeys } from '../data/recommendationCatalog';
import {
  findFeatureCategoriesByIds,
  findInteractionsForUser,
  findPreferencesForUser,
  findRecommendationDestinations,
} from '../repositories/recommendation.repository';

export const BEHAVIOR_CONFIG = {
  maxWeight: 0.4,
  weightPerDestination: 0.1,
  viewStep: 0.1,
  viewCap: 0.3,
  likeValue: 1,
  saveValue: 1,
  ratingNeutral: 3,
  ratingScale: 2,
} as const;

interface InteractionRow {
  destinationId: string;
  type: string;
  value: number | null;
}

interface FeatureWeight {
  featureId: string;
  weight: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function computeInterestByDestination(interactions: InteractionRow[]): Map<string, number> {
  const views = new Map<string, number>();
  const ratings = new Map<string, number[]>();
  const interest = new Map<string, number>();
  const add = (destinationId: string, amount: number) =>
    interest.set(destinationId, (interest.get(destinationId) ?? 0) + amount);

  for (const { destinationId, type, value } of interactions) {
    if (type === 'VIEW') {
      views.set(destinationId, (views.get(destinationId) ?? 0) + 1);
    } else if (type === 'LIKE') {
      add(destinationId, BEHAVIOR_CONFIG.likeValue);
    } else if (type === 'SAVE') {
      add(destinationId, BEHAVIOR_CONFIG.saveValue);
    } else if (type === 'RATING' && typeof value === 'number') {
      const list = ratings.get(destinationId) ?? [];
      list.push(clamp(value, 1, 5));
      ratings.set(destinationId, list);
    }
  }

  for (const [destinationId, count] of views) {
    add(destinationId, Math.min(count * BEHAVIOR_CONFIG.viewStep, BEHAVIOR_CONFIG.viewCap));
  }
  for (const [destinationId, list] of ratings) {
    const average = list.reduce((sum, rating) => sum + rating, 0) / list.length;
    add(destinationId, (average - BEHAVIOR_CONFIG.ratingNeutral) / BEHAVIOR_CONFIG.ratingScale);
  }

  for (const [destinationId, value] of interest) {
    const bounded = clamp(value, -1, 1);
    if (bounded === 0) interest.delete(destinationId);
    else interest.set(destinationId, bounded);
  }
  return interest;
}

export function buildBehaviorProfile(
  interest: Map<string, number>,
  destinations: Array<{ id: string; features: FeatureWeight[] }>,
): Map<string, number> {
  const profile = new Map<string, number>();
  for (const destination of destinations) {
    const destinationInterest = interest.get(destination.id);
    if (!destinationInterest) continue;
    for (const { featureId, weight } of destination.features) {
      profile.set(featureId, (profile.get(featureId) ?? 0) + destinationInterest * clamp(weight, 0, 1));
    }
  }
  return profile;
}

export function cosineSimilarity(profile: Map<string, number>, features: FeatureWeight[]): number {
  let dot = 0;
  let featureNorm = 0;
  for (const { featureId, weight } of features) {
    const w = clamp(weight, 0, 1);
    dot += (profile.get(featureId) ?? 0) * w;
    featureNorm += w * w;
  }
  let profileNorm = 0;
  for (const value of profile.values()) profileNorm += value * value;
  if (profileNorm === 0 || featureNorm === 0) return 0;
  return clamp(dot / (Math.sqrt(profileNorm) * Math.sqrt(featureNorm)), -1, 1);
}

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
  preferenceScore: number;
  behaviorScore: number;
  matchedFeatures: string[];
}

export interface PaginatedRecommendations {
  items: DestinationScore[];
  total: number;
  limit: number;
  offset: number;
  behaviorWeight: number;
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

  const interactions = (await findInteractionsForUser(userId)) ?? [];
  const interestByDestination = computeInterestByDestination(interactions);
  const knownDestinationIds = new Set(destinations.map(({ id }) => id));
  for (const destinationId of [...interestByDestination.keys()]) {
    if (!knownDestinationIds.has(destinationId)) interestByDestination.delete(destinationId);
  }
  const behaviorProfile = buildBehaviorProfile(interestByDestination, destinations);
  const hasBehaviorProfile = [...behaviorProfile.values()].some((value) => value !== 0);
  const totalInterestStrength = [...interestByDestination.values()].reduce(
    (sum, val) => sum + Math.abs(val),
    0,
  );
  const behaviorWeight = hasBehaviorProfile
    ? Math.min(
      BEHAVIOR_CONFIG.maxWeight,
      totalInterestStrength * BEHAVIOR_CONFIG.weightPerDestination,
    ) : 0;

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
    const matchedFeatures: string[] = [];
    const destinationFeatureById = new Map(
      destination.features.map((feature) => [feature.featureId, feature]),
    );

    for (const categoryPreferences of preferencesByCategory.values()) {
      const categoryWeight = Math.max(0, categoryPreferences[0].category.defaultWeight);
      maxScore += categoryWeight;
      const bestMatchWeight = categoryPreferences.reduce((bestWeight, preference) => {
        const match = destinationFeatureById.get(preference.featureId);
        return Math.max(bestWeight, clamp(match?.weight ?? 0, 0, 1));
      }, 0);
      score += categoryWeight * bestMatchWeight;

      if (bestMatchWeight > 0) {
        for (const preference of categoryPreferences) {
          const match = destinationFeatureById.get(preference.featureId);
          if (match && match.weight > 0) matchedFeatures.push(preference.feature.key);
        }
      }
    }

    const preferenceRatio = maxScore > 0 ? clamp(score / maxScore, 0, 1) : 0;
    const behaviorRatio = behaviorWeight > 0
      ? Math.max(0, cosineSimilarity(behaviorProfile, destination.features))
      : 0;
    const combinedRatio = (1 - behaviorWeight) * preferenceRatio + behaviorWeight * behaviorRatio;
    const normalizedScore = clamp(Math.round(combinedRatio * 100), 0, 100);

    const { features, ...destinationData } = destination;
    const featureViews: DestinationFeatureView[] = features.map((f) => ({
      featureId: f.featureId,
      key: f.feature.key,
      categoryKey: f.feature.category.key,
      weight: f.weight,
    }));

    return {
      destination: {
        ...destinationData,
        features: featureViews,
      },
      score: normalizedScore,
      preferenceScore: Math.round(preferenceRatio * 100),
      behaviorScore: Math.round(behaviorRatio * 100),
      matchedFeatures,
    };
  });

  const ranked = results
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.behaviorScore !== a.behaviorScore) {
        return b.behaviorScore - a.behaviorScore;
      }
      if (b.destination.popularityScore !== a.destination.popularityScore) {
        return b.destination.popularityScore - a.destination.popularityScore;
      }
      return a.destination.slug.localeCompare(b.destination.slug);
    });

  return {
    items: ranked.slice(offset, offset + limit),
    total: ranked.length,
    limit,
    offset,
    behaviorWeight: Math.round(behaviorWeight * 100) / 100,
  };
}