import { prisma } from '../lib/prisma';
import { recommendationCategoryKeys } from '../data/recommendationCatalog';

const legacyCategoryKeys = ['activity', 'climate', 'budget', 'landscape', 'season'];

interface PreferenceInput {
  categoryId: string;
  featureId: string;
}

export async function saveUserPreferences(userId: string, preferences: PreferenceInput[]) {
  const preferenceKeys = preferences.map(({ categoryId, featureId }) => `${categoryId}:${featureId}`);
  if (new Set(preferenceKeys).size !== preferenceKeys.length) {
    throw new Error('INVALID_PREFERENCES');
  }

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

  const submittedCategoryIds = new Set(preferences.map(({ categoryId }) => categoryId));
  const selectedCategories = await prisma.featureCategory.findMany({
    where: {
      id: { in: [...submittedCategoryIds] },
    },
    select: { id: true, key: true },
  });
  const submittedCategoryKeys = new Set(selectedCategories.map(({ key }) => key));
  const hasCurrentQuizSelections = recommendationCategoryKeys.some((key) => submittedCategoryKeys.has(key));
  const requiredCategoryKeys = hasCurrentQuizSelections ? recommendationCategoryKeys : legacyCategoryKeys;

  if (
    requiredCategoryKeys.some(
      (key) => !selectedCategories.some((category) => category.key === key),
    )
  ) {
    throw new Error('INCOMPLETE_PREFERENCES');
  }

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

export async function getUserPreferences(userId: string) {
  return prisma.userPreference.findMany({
    where: { userId },
    include: { category: true, feature: true },
  });
}