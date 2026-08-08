import { prisma } from '../lib/prisma';

interface PreferenceInput {
  categoryId: string;
  featureId: string;
}

export async function saveUserPreferences(userId: string, preferences: PreferenceInput[]) {
  const results = await Promise.all(
    preferences.map(({ categoryId, featureId }) =>
      prisma.userPreference.upsert({
        where: { userId_categoryId: { userId, categoryId } },
        create: { userId, categoryId, featureId },
        update: { featureId },
      }),
    ),
  );
  return results;
}

export async function getUserPreferences(userId: string) {
  return prisma.userPreference.findMany({
    where: { userId },
    include: { category: true, feature: true },
  });
}