import { Router } from 'express';
import { listDestinations, getDestination } from '../controllers/destinations.controller';

const router = Router();

router.get('/', listDestinations);
router.get('/:id', getDestination);

export default router;