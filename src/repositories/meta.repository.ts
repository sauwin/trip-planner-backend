import { prisma } from '../lib/prisma';
import { recommendationCategoryKeys, recommendationFeatureKeys } from '../data/recommendationCatalog';

export async function findFeatureCategoriesWithFeatures() {
  return prisma.featureCategory.findMany({
    where: { key: { in: [...recommendationCategoryKeys] } },
    include: {
      features: {
        select: { id: true, key: true },
        where: { key: { in: [...recommendationFeatureKeys] } },
        orderBy: { key: 'asc' },
      },
    },
    orderBy: { key: 'asc' },
  });
}
