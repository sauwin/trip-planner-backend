import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getRecommendations } from '../controllers/recommendation.controller';
import { validateQuery } from '../middleware/validate';
import { listRecommendationsQuerySchema } from '../schemas/recommendation.schema';

const router = Router();

router.get('/', requireAuth, validateQuery(listRecommendationsQuerySchema), getRecommendations);

export default router;