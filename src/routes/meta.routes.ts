import { Router } from 'express';
import { listFeatureCategories } from '../controllers/meta.controller';

const router = Router();

router.get('/feature-categories', listFeatureCategories);

export default router;