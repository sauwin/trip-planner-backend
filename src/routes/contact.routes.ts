import { Router } from 'express';
import { sendContactMessage } from '../controllers/contact.controller';
import { validateBody } from '../middleware/validate';
import { contactSchema } from '../schemas/contact.schema';
import { contactRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/', contactRateLimit, validateBody(contactSchema), sendContactMessage);

export default router;