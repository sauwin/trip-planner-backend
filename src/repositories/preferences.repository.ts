import { prisma } from '../lib/prisma';

export async function findUserId(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
}

export async function findFeaturesByIds(featureIds: string[]) {
  return prisma.feature.findMany({
    where: { id: { in: featureIds } },
    select: { id: true, categoryId: true },
  });
}

export async function findCategoriesByIds(categoryIds: string[]) {
  return prisma.featureCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, key: true },
  });
}

export async function replaceUserPreferences(
  userId: string,
  preferences: Array<{ categoryId: string; featureId: string }>,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.userPreference.deleteMany({ where: { userId } });
    await transaction.userPreference.createMany({
      data: preferences.map(({ categoryId, featureId }) => ({ userId, categoryId, featureId })),
    });
    return transaction.userPreference.findMany({
      where: { userId },
      include: { category: true, feature: true },
    });
  });
}

export async function findUserPreferences(userId: string) {
  return prisma.userPreference.findMany({
    where: { userId },
    include: { category: true, feature: true },
  });
}
