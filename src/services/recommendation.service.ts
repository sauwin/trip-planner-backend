import { prisma } from '../lib/prisma';

interface DestinationScore {
  destination: {
    id: string;
    slug: string;
    country: string;
    latitude: number;
    longitude: number;
    translations: unknown;
    popularityScore: number;
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
  offset: number = 0
): Promise<PaginatedRecommendations> {
  const preferences = await prisma.userPreference.findMany({
    where: { userId },
    include: { category: true },
  });

  if (preferences.length === 0) {
    throw new Error('NO_PREFERENCES');
  }

  const destinations = await prisma.destination.findMany({
    include: { features: true },
  });

  const results = destinations.map((destination) => {
    let score = 0;
    let maxScore = 0;

    for (const pref of preferences) {
      const categoryWeight = pref.category.defaultWeight;
      maxScore += categoryWeight;

      const match = destination.features.find((f) => f.featureId === pref.featureId);
      const matchWeight = match ? match.weight : 0;

      score += categoryWeight * matchWeight;
    }

    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const { features, ...destinationData } = destination;
    return { destination: destinationData, score: normalizedScore };
  });

  const ranked = results
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.destination.popularityScore - a.destination.popularityScore;
    });

  return {
    items: ranked.slice(offset, offset + limit),
    total: ranked.length,
    limit,
    offset,
  };
}