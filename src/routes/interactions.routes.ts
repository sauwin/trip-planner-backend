import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { recordInteractionHandler, removeInteractionHandler, listInteractions, getDestinationStatusHandler } from '../controllers/interactions.controller';
import { validateBody } from '../middleware/validate';
import { createInteractionSchema } from '../schemas/interactions.schema';

const router = Router();

router.get('/', requireAuth, listInteractions);
router.get('/status/:destinationId', requireAuth, getDestinationStatusHandler);
router.post('/', requireAuth, validateBody(createInteractionSchema), recordInteractionHandler);
router.delete('/:destinationId/:type', requireAuth, removeInteractionHandler);

export default router;