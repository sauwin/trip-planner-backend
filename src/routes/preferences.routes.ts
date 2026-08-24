import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { savePreferences, getPreferences } from '../controllers/preferences.controller';
import { validateBody } from '../middleware/validate';
import { savePreferencesSchema } from '../schemas/preferences.schema';

const router = Router();

router.get('/', requireAuth, getPreferences);
router.post('/', requireAuth, validateBody(savePreferencesSchema), savePreferences);

export default router;