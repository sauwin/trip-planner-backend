import { Router } from 'express';
import { listDestinations, searchDestinations, getDestination, createDestinationHandler, deleteDestinationHandler, getSavedDestination } from '../controllers/destinations.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { createDestinationSchema, deleteDestinationSchema, listDestinationsQuerySchema, searchDestinationsQuerySchema } from '../schemas/destinations.schema';

const router = Router();

router.get('/', requireAuth, validateQuery(listDestinationsQuerySchema), listDestinations);
router.get('/search', validateQuery(searchDestinationsQuerySchema), searchDestinations);
router.get('/saved', requireAuth, getSavedDestination);
router.get('/:id', requireAuth, getDestination);
router.post('/', requireAuth, requireAdmin, validateBody(createDestinationSchema), createDestinationHandler);
router.delete('/:id', requireAuth, requireAdmin, validateParams(deleteDestinationSchema), deleteDestinationHandler);

export default router;