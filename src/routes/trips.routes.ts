import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createTripHandler, listTripsHandler, getTripHandler, addDestinationHandler, deleteTripHandler, deleteDestinationHandler, updateTripHandler } from '../controllers/trips.controller';
import { validateBody } from '../middleware/validate';
import { createTripSchema, addDestinationSchema } from '../schemas/trips.schema';
import { updateAccommodationSchema } from '../schemas/trips.schema';
import { updateAccommodationHandler } from '../controllers/trips.controller';
import expensesRouter from './expenses.routes';

const router = Router();

router.use('/:tripId/expenses', expensesRouter);
router.get('/', requireAuth, listTripsHandler);
router.get('/:id', requireAuth, getTripHandler);
router.post('/:id/destinations', requireAuth, validateBody(addDestinationSchema), addDestinationHandler);
router.post('/', requireAuth, validateBody(createTripSchema), createTripHandler);
router.patch('/:id/destinations/:destinationId', requireAuth, validateBody(updateAccommodationSchema), updateAccommodationHandler)
router.patch('/:id', requireAuth, validateBody(createTripSchema), updateTripHandler);
router.delete('/:id', requireAuth, deleteTripHandler);;
router.delete('/:id/destinations/:destinationId', requireAuth, deleteDestinationHandler);

export default router;