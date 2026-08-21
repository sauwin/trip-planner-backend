import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';

import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/auth.schema';

import { authRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authRateLimit, validateBody(registerSchema), register);
router.post('/login', authRateLimit, validateBody(loginSchema), login);
router.post('/refresh', authRateLimit, validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(logoutSchema), logout);

export default router;