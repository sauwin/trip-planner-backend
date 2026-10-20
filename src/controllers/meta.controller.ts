import { Request, Response } from 'express';
import { getFeatureCategoriesWithFeatures } from '../services/meta.service';
import { handleServiceError } from '../lib/serviceErrors';

export async function listFeatureCategories(_req: Request, res: Response) {
  try {
    const categories = await getFeatureCategoriesWithFeatures();
    res.json(categories);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch feature categories');
  }
}