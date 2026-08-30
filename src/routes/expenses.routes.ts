import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate';
import { createExpenseSchema, updateExpenseSchema } from '../schemas/expenses.schema';
import { createExpenseHandler, listExpensesHandler, deleteExpenseHandler, updateExpenseHandler } from '../controllers/expenses.controller';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, listExpensesHandler);
router.post('/', requireAuth, validateBody(createExpenseSchema), createExpenseHandler);
router.patch('/:expenseId', requireAuth, validateBody(updateExpenseSchema), updateExpenseHandler);
router.delete('/:expenseId', requireAuth, deleteExpenseHandler);

export default router;
