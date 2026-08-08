import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getRecommendations } from '../controllers/recommendation.controller';

const router = Router();

router.get('/', requireAuth, getRecommendations);

export default router;