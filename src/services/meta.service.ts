import { prisma } from '../lib/prisma';

export async function getFeatureCategoriesWithFeatures() {
  return prisma.featureCategory.findMany({
    include: {
      features: {
        select: { id: true, key: true },
      },
    },
    orderBy: { key: 'asc' },
  });
}