import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createTripHandler, listTripsHandler, getTripHandler, addDestinationHandler, deleteTripHandler } from '../controllers/trips.controller';
import { validateBody } from '../middleware/validate';
import { createTripSchema, addDestinationSchema, deleteTripSchema } from '../schemas/trips.schema';
import { updateAccommodationSchema } from '../schemas/trips.schema';
import { updateAccommodationHandler } from '../controllers/trips.controller';

const router = Router();

router.post('/', requireAuth, validateBody(createTripSchema), createTripHandler);
router.get('/', requireAuth, listTripsHandler);
router.get('/:id', requireAuth, getTripHandler);
router.post('/:id/destinations', requireAuth, validateBody(addDestinationSchema), addDestinationHandler);
router.delete('/:id', requireAuth, validateBody(deleteTripSchema), deleteTripHandler);
router.patch('/:id/destinations/:destinationId', requireAuth, validateBody(updateAccommodationSchema), updateAccommodationHandler);

export default router;