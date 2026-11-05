import { InteractionType } from '../generated/prisma/browser';
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

export async function findInteractionsForUser(userId: string) {
  const destinationSelect = { select: { slug: true, country: true, translations: true } } as const;
  const [interactions, reviews] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId },
      include: { destination: destinationSelect },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.destinationReview.findMany({
      where: { userId },
      include: { destination: destinationSelect },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return [
    ...interactions,
    ...reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      destinationId: r.destinationId,
      type: InteractionType.RATING,
      value: r.rating,
      createdAt: r.createdAt,
      destination: r.destination,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}