import { prisma } from '../lib/prisma';

interface PreferenceInput {
  categoryId: string;
  featureId: string;
}

export async function saveUserPreferences(userId: string, preferences: PreferenceInput[]) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const features = await prisma.feature.findMany({
    where: { id: { in: preferences.map(({ featureId }) => featureId) } },
    select: { id: true, categoryId: true },
  });
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  if (preferences.some(({ categoryId, featureId }) => featureById.get(featureId)?.categoryId !== categoryId)) {
    throw new Error('INVALID_PREFERENCES');
  }

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