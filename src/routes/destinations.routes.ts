import { Router } from 'express';
import { listDestinations, searchDestinations, getDestination, createDestinationHandler, updateDestinationHandler, deleteDestinationHandler, getSavedDestination } from '../controllers/destinations.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import { createDestinationSchema, deleteDestinationSchema, listDestinationsQuerySchema, searchDestinationsQuerySchema } from '../schemas/destinations.schema';

const router = Router();

router.get('/', requireAuth, validateQuery(listDestinationsQuerySchema), listDestinations);
router.get('/search', validateQuery(searchDestinationsQuerySchema), searchDestinations);
router.get('/saved', requireAuth, getSavedDestination);
router.get('/:id', requireAuth, getDestination);
router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), validateBody(createDestinationSchema), createDestinationHandler);
router.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), validateParams(deleteDestinationSchema), validateBody(createDestinationSchema), updateDestinationHandler);
router.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), validateParams(deleteDestinationSchema), deleteDestinationHandler);

export default router;