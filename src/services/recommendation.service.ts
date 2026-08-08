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

export async function getRecommendationsForUser(userId: string): Promise<DestinationScore[]> {
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

    for (const pref of preferences) {
      const match = destination.features.find((f) => f.featureId === pref.featureId);
      const matchWeight = match ? match.weight : 0;
      score += pref.category.defaultWeight * matchWeight;
    }

    const { features, ...destinationData } = destination;
    return { destination: destinationData, score };
  });

  results.sort((a, b) => b.score - a.score);

  return results;
}