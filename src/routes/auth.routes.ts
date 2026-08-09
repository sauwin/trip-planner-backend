import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';

import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(logoutSchema), logout);

export default router;