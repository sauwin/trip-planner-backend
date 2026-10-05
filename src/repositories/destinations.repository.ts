import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export const DESTINATION_FEATURES_INCLUDE = {
  features: { include: { feature: { include: { category: true } } } },
  interactions: { where: { type: 'RATING' }, select: { value: true } },
} satisfies Prisma.DestinationInclude;

export type DestinationWithRawFeatures = Prisma.DestinationGetPayload<{
  include: typeof DESTINATION_FEATURES_INCLUDE;
}>;

export async function findFeatureCategories(featureIds: string[]) {
  return prisma.feature.findMany({
    where: { id: { in: featureIds } },
    select: { id: true, categoryId: true },
  });
}

export async function findDestinations(where?: Prisma.DestinationWhereInput) {
  return prisma.destination.findMany({
    where,
    include: DESTINATION_FEATURES_INCLUDE,
  });
}

export async function countDestinations(where?: Prisma.DestinationWhereInput) {
  return prisma.destination.count({ where });
}

export async function findDestinationById(id: string) {
  return prisma.destination.findUnique({
    where: { id },
    include: DESTINATION_FEATURES_INCLUDE,
  });
}

export async function createDestination(data: {
  slug: string;
  country: string;
  latitude: number;
  longitude: number;
  translations: Prisma.InputJsonValue;
}) {
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
