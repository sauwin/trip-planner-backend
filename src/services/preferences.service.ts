import { recommendationCategoryKeys } from '../data/recommendationCatalog';
import {
  findCategoriesByIds,
  findFeaturesByIds,
  findUserId,
  findUserPreferences,
  replaceUserPreferences,
} from '../repositories/preferences.repository';

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

  const user = await findUserId(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const features = await findFeaturesByIds(preferences.map(({ featureId }) => featureId));
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  if (preferences.some(({ categoryId, featureId }) => featureById.get(featureId)?.categoryId !== categoryId)) {
    throw new Error('INVALID_PREFERENCES');
  }

  const submittedCategoryIds = new Set(preferences.map(({ categoryId }) => categoryId));
  const selectedCategories = await findCategoriesByIds([...submittedCategoryIds]);
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

  return replaceUserPreferences(userId, preferences);
}

export async function getUserPreferences(userId: string) {
  return findUserPreferences(userId);
}