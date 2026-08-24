import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { recordInteraction, listInteractions } from '../controllers/interactions.controller';
import { validateBody } from '../middleware/validate';
import { createInteractionSchema } from '../schemas/interactions.schema';

const router = Router();

router.get('/', requireAuth, listInteractions);
router.post('/', requireAuth, validateBody(createInteractionSchema), recordInteraction);

export default router;