import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { savePreferences, getPreferences } from '../controllers/preferences.controller';

import { validateBody } from '../middleware/validate';
import { savePreferencesSchema } from '../schemas/preferences.schema';

const router = Router();

router.post('/', requireAuth, validateBody(savePreferencesSchema), savePreferences);
router.get('/', requireAuth, getPreferences);

export default router;