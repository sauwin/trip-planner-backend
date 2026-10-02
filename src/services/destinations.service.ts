import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { computePopularityScore } from '../lib/popularity';

export interface ListDestinationsParams {
  limit: number;
  offset: number;
  country?: string;
  featureIds?: string[];
}

const FEATURES_INCLUDE = {
  features: { include: { feature: { include: { category: true } } } },
  interactions: { where: { type: 'RATING' }, select: { value: true } },
} satisfies Prisma.DestinationInclude;

type DestinationWithRawFeatures = Prisma.DestinationGetPayload<{ include: typeof FEATURES_INCLUDE }>;

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
  const conditions: Prisma.DestinationWhereInput[] = [];
  if (country) conditions.push({ country });
  if (featureIds && featureIds.length > 0) {
    const features = await prisma.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true, categoryId: true },
    });
    const featureCategories = new Map(features.map((feature) => [feature.id, feature.categoryId]));
    const featureIdsByCategory = new Map<string, string[]>();

    for (const featureId of featureIds) {
      const categoryId = featureCategories.get(featureId) ?? `unknown:${featureId}`;
      const selectedIds = featureIdsByCategory.get(categoryId) ?? [];
      selectedIds.push(featureId);
      featureIdsByCategory.set(categoryId, selectedIds);
    }

    conditions.push(
      ...[...featureIdsByCategory.values()].map((selectedIds) => ({
        features: { some: { featureId: { in: selectedIds } } },
      })),
    );
  }
  const where = conditions.length > 0 ? { AND: conditions } : undefined;

  const [items, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      include: FEATURES_INCLUDE,
    }),
    prisma.destination.count({ where }),
  ]);

  const rankedItems = items
    .map(withLeanFeatures)
    .sort((a, b) => b.popularityScore - a.popularityScore);

  return { items: rankedItems.slice(offset, offset + limit), total, limit, offset };
}

export async function getDestinationById(id: string) {
  const destination = await prisma.destination.findUnique({
    where: { id },
    include: FEATURES_INCLUDE,
  });

  return destination ? withLeanFeatures(destination) : null;
}

export async function createDestination(data: { slug: string; country: string; latitude: number; longitude: number; translations: Prisma.InputJsonValue; }) {
  return prisma.destination.create({ data });
}

export async function deleteDestination(id: string) {
  return prisma.destination.delete({ where: { id } });
}

export async function getSavedDestinations(userId: string) {
  const savedDestination = await prisma.destination.findMany({
    where: {
      interactions: {
        some: {
          userId: userId,
          type: 'SAVE'
        }
      }
    }
  })
  return savedDestination;
}