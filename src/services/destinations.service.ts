import { computePopularityScore } from '../lib/popularity';
import {
  createDestination as insertDestination,
  CreateDestinationData,
  deleteDestination as removeDestination,
  findDestinationById,
  findDestinations,
  findSavedDestinations as querySavedDestinations,
} from '../repositories/destinations.repository';

export interface ListDestinationsParams {
  limit: number;
  offset: number;
  country?: string;
  featureIds?: string[];
}

type DestinationWithRawFeatures = NonNullable<Awaited<ReturnType<typeof findDestinationById>>>;

function withLeanFeatures<T extends DestinationWithRawFeatures>(destination: T) {
  const { features, interactions, ...rest } = destination;
  const popularityScore = computePopularityScore(interactions);

  return {
    ...rest,
    popularityScore,
    features: features.map((f) => ({
      featureId: f.featureId,
      key: f.feature.key,
      categoryKey: f.feature.category.key,
      weight: f.weight,
    })),
  };
}

export async function getAllDestinations({ limit, offset, country, featureIds }: ListDestinationsParams) {
  const { items, total } = await findDestinations({ country, featureIds });

  const rankedItems = items
    .map(withLeanFeatures)
    .sort((a, b) => b.popularityScore - a.popularityScore);

  return { items: rankedItems.slice(offset, offset + limit), total, limit, offset };
}

export async function getDestinationById(id: string) {
  const destination = await findDestinationById(id);

  return destination ? withLeanFeatures(destination) : null;
}

export async function createDestination(data: CreateDestinationData) {
  return insertDestination(data);
}

export async function deleteDestination(id: string) {
  return removeDestination(id);
}

export async function getSavedDestinations(userId: string) {
  return querySavedDestinations(userId);
}