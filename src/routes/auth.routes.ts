import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPasswordHandler,
} from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema';
import {
  authRateLimit,
  passwordResetAttemptRateLimit,
  passwordResetEmailRateLimit,
  passwordResetRequestRateLimit,
} from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authRateLimit, validateBody(registerSchema), register);
router.post('/login', authRateLimit, validateBody(loginSchema), login);
router.post('/refresh', authRateLimit, validateBody(refreshSchema), refresh);
router.post('/logout', validateBody(logoutSchema), logout);
router.post(
  '/forgot-password',
  passwordResetRequestRateLimit,
  passwordResetEmailRateLimit,
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
router.post('/reset-password', passwordResetAttemptRateLimit, validateBody(resetPasswordSchema), resetPasswordHandler);

export default router;