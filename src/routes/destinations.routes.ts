import { Router } from 'express';
import { listDestinations, getDestination, createDestinationHandler, deleteDestinationHandler } from '../controllers/destinations.controller';
import { requireAuth } from '../middleware/auth.middleware';

import { validateBody } from '../middleware/validate';
import { createDestinationSchema, deleteDestinationSchema } from '../schemas/destinations.schema';

const router = Router();

router.get('/', listDestinations);
router.get('/:id', getDestination);
router.post('/', requireAuth, validateBody(createDestinationSchema), createDestinationHandler);
router.delete('/:id', requireAuth, validateBody(deleteDestinationSchema), deleteDestinationHandler);

export default router;