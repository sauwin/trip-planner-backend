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

const DETAIL_INCLUDE = {
  ...FEATURES_INCLUDE,
  pointsOfInterest: { orderBy: { name: 'asc' } },
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
    conditions.push(...featureIds.map((featureId) => ({ features: { some: { featureId } } })));
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
    include: DETAIL_INCLUDE,
  });

  return destination ? withLeanFeatures(destination) : null;
}

export async function createDestination(data: { slug: string; country: string; latitude: number; longitude: number; translations: Prisma.InputJsonValue; }) {
  return prisma.destination.create({ data });
}

export async function deleteDestination(id: string) {
  return prisma.destination.delete({ where: { id } });
}