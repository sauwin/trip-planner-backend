import { Router } from 'express';
import { listDestinations, getDestination, createDestinationHandler, deleteDestinationHandler } from '../controllers/destinations.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/', listDestinations);
router.get('/:id', getDestination);
router.post('/', requireAuth, createDestinationHandler);
router.delete('/:id', requireAuth, deleteDestinationHandler);

export default router;