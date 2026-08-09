import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createTripHandler, listTripsHandler, getTripHandler, addDestinationHandler, deleteTripHandler } from '../controllers/trips.controller';

const router = Router();

router.post('/', requireAuth, createTripHandler);
router.get('/', requireAuth, listTripsHandler);
router.get('/:id', requireAuth, getTripHandler);
router.post('/:id/destinations', requireAuth, addDestinationHandler);
router.delete('/:id', requireAuth, deleteTripHandler);

export default router;