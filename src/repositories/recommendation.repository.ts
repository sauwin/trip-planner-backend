import { prisma } from '../lib/prisma';

export async function findPreferencesForUser(userId: string) {
  return prisma.userPreference.findMany({
    where: { userId },
    include: { category: true, feature: true },
  });
}

export async function findFeatureCategoriesByIds(featureIds: string[]) {
  return prisma.feature.findMany({
    where: { id: { in: featureIds } },
    select: { id: true, categoryId: true },
  });
}

export async function findRecommendationDestinations() {
  return prisma.destination.findMany({
    select: {
      id: true,
      slug: true,
      country: true,
      latitude: true,
      longitude: true,
      translations: true,
      popularityScore: true,
      features: { include: { feature: { include: { category: true } } } },
    },
  });
}
