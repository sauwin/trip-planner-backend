import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createTripHandler, listTripsHandler, getTripHandler, addDestinationHandler, deleteTripHandler, deleteDestinationHandler, updateTripHandler, updateTripDestinationDetailsHandler } from '../controllers/trips.controller';
import { validateBody } from '../middleware/validate';
import { createTripSchema, addDestinationSchema, updateTripDestinationDetailsSchema, updateTripSchema } from '../schemas/trips.schema';
import expensesRouter from './expenses.routes';

const router = Router();

router.use('/:tripId/expenses', expensesRouter);
router.get('/', requireAuth, listTripsHandler);
router.get('/:id', requireAuth, getTripHandler);
router.post('/:id/destinations', requireAuth, validateBody(addDestinationSchema), addDestinationHandler);
router.post('/', requireAuth, validateBody(createTripSchema), createTripHandler);
router.patch('/:id/destinations/:destinationId', requireAuth, validateBody(updateTripDestinationDetailsSchema), updateTripDestinationDetailsHandler);
router.patch('/:id', requireAuth, validateBody(updateTripSchema), updateTripHandler);
router.delete('/:id', requireAuth, deleteTripHandler);
router.delete('/:id/destinations/:destinationId', requireAuth, deleteDestinationHandler);

export default router;