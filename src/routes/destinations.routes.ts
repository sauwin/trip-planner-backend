import { Router } from 'express';
import { listDestinations, getDestination, createDestinationHandler, deleteDestinationHandler } from '../controllers/destinations.controller';
import { requireAuth } from '../middleware/auth.middleware';

import { validateBody, validateQuery } from '../middleware/validate';
import { createDestinationSchema, deleteDestinationSchema, listDestinationsQuerySchema } from '../schemas/destinations.schema';

const router = Router();

router.get('/', validateQuery(listDestinationsQuerySchema), listDestinations);
router.get('/:id', getDestination);
router.post('/', requireAuth, validateBody(createDestinationSchema), createDestinationHandler);
router.delete('/:id', requireAuth, validateBody(deleteDestinationSchema), deleteDestinationHandler);

export default router;