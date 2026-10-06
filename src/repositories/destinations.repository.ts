import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export const DESTINATION_FEATURES_INCLUDE = {
  features: { include: { feature: { include: { category: true } } } },
  interactions: { where: { type: 'RATING' }, select: { value: true } },
} satisfies Prisma.DestinationInclude;

export interface DestinationFilters {
  country?: string;
  featureIds?: string[];
}

export async function findDestinations({ country, featureIds }: DestinationFilters) {
  const conditions: Prisma.DestinationWhereInput[] = [];
  if (country) conditions.push({ country });

  if (featureIds?.length) {
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
    prisma.destination.findMany({ where, include: DESTINATION_FEATURES_INCLUDE }),
    prisma.destination.count({ where }),
  ]);

  return { items, total };
}

export async function findDestinationById(id: string) {
  return prisma.destination.findUnique({
    where: { id },
    include: DESTINATION_FEATURES_INCLUDE,
  });
}

export interface CreateDestinationData {
  slug: string;
  country: string;
  latitude: number;
  longitude: number;
  translations: Prisma.InputJsonValue;
}

export async function createDestination(data: CreateDestinationData) {
  return prisma.destination.create({ data });
}

export async function deleteDestination(id: string) {
  return prisma.destination.delete({ where: { id } });
}

export async function findSavedDestinations(userId: string) {
  return prisma.destination.findMany({
    where: { interactions: { some: { userId, type: 'SAVE' } } },
  });
}
