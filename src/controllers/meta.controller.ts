import { Request, Response } from 'express';
import { getFeatureCategoriesWithFeatures } from '../services/meta.service';

export async function listFeatureCategories(req: Request, res: Response) {
  try {
    const categories = await getFeatureCategoriesWithFeatures();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch feature categories' });
  }
}