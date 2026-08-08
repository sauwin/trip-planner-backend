import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { recordInteraction, listInteractions } from '../controllers/interactions.controller';

const router = Router();

router.post('/', requireAuth, recordInteraction);
router.get('/', requireAuth, listInteractions);

export default router;