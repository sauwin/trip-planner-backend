import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { createExpenseSchema } from '../schemas/expenses.schema';
import { createExpenseHandler, listExpensesHandler, deleteExpenseHandler } from '../controllers/expenses.controller';

const router = Router({ mergeParams: true });

router.post('/', requireAuth, validateBody(createExpenseSchema), createExpenseHandler);
router.get('/', requireAuth, listExpensesHandler);
router.delete('/:expenseId', requireAuth, deleteExpenseHandler);

export default router;