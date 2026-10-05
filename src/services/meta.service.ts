import { findFeatureCategoriesWithFeatures } from '../repositories/meta.repository';

export async function getFeatureCategoriesWithFeatures() {
  return findFeatureCategoriesWithFeatures();
}