import { Router } from 'express';
import { listDestinations, getDestination, createDestinationHandler, deleteDestinationHandler } from '../controllers/destinations.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { createDestinationSchema, deleteDestinationSchema, listDestinationsQuerySchema } from '../schemas/destinations.schema';

const router = Router();

router.get('/', validateQuery(listDestinationsQuerySchema), listDestinations);
router.get('/:id', getDestination);
router.post('/', requireAuth, requireAdmin, validateBody(createDestinationSchema), createDestinationHandler);
router.delete('/:id', requireAuth, requireAdmin, validateParams(deleteDestinationSchema), deleteDestinationHandler);

export default router;