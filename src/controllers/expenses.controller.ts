import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createExpense, getTripExpenses, updateExpense, deleteExpense } from '../services/expenses.service';
import { handleServiceError } from '../lib/serviceErrors';

function getParamId(value: string | string[]) {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new Error('INVALID_EXPENSE_ID');
  }

  return id;
}

const TRIP_NOT_FOUND = { TRIP_NOT_FOUND: { status: 404, message: 'Trip not found' } };

export async function createExpenseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { description, amount, category, date } = req.body;
    const tripId = getParamId(req.params.tripId);
    const expense = await createExpense(req.userId!, tripId, description, amount, category, date);
    res.status(201).json(expense);
  } catch (error) {
    handleServiceError(error, res, 'Failed to create expense', {
      INVALID_EXPENSE_ID: { status: 400, message: 'Trip id is required' },
      ...TRIP_NOT_FOUND,
    });
  }
}

export async function listExpensesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.tripId);
    const expenses = await getTripExpenses(req.userId!, tripId);
    res.json(expenses);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch expenses', {
      INVALID_EXPENSE_ID: { status: 400, message: 'Trip id is required' },
      ...TRIP_NOT_FOUND,
    });
  }
}

export async function updateExpenseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { description, amount, category } = req.body;
    const tripId = getParamId(req.params.tripId);
    const expenseId = getParamId(req.params.expenseId);
    const expense = await updateExpense(req.userId!, tripId, expenseId, { description, amount, category });
    res.json(expense);
  } catch (error) {
    handleServiceError(error, res, 'Failed to update expense', {
      INVALID_EXPENSE_ID: { status: 400, message: 'Trip id and expense id are required' },
      ...TRIP_NOT_FOUND,
      P2025: { status: 404, message: 'Expense not found' },
    });
  }
}

export async function deleteExpenseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.tripId);
    const expenseId = getParamId(req.params.expenseId);
    await deleteExpense(req.userId!, tripId, expenseId);
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete expense', {
      INVALID_EXPENSE_ID: { status: 400, message: 'Trip id and expense id are required' },
      ...TRIP_NOT_FOUND,
      P2025: { status: 404, message: 'Expense not found' },
    });
  }
}