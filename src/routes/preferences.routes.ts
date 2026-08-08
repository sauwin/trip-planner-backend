import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { savePreferences, getPreferences } from '../controllers/preferences.controller';

const router = Router();

router.post('/', requireAuth, savePreferences);
router.get('/', requireAuth, getPreferences);

export default router;