import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createExpense, getTripExpenses, deleteExpense } from '../services/expenses.service';

function getParamId(value: string | string[]) {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new Error('INVALID_EXPENSE_ID');
  }

  return id;
}

export async function createExpenseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { description, amount, date } = req.body;
    const tripId = getParamId(req.params.tripId);
    const expense = await createExpense(req.userId!, tripId, description, amount, date);
    res.status(201).json(expense);
  } catch (error: any) {
    if (error.message === 'INVALID_EXPENSE_ID') {
      res.status(400).json({ error: 'Trip id is required' });
      return;
    }
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
}

export async function listExpensesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.tripId);
    const expenses = await getTripExpenses(req.userId!, tripId);
    res.json(expenses);
  } catch (error: any) {
    if (error.message === 'INVALID_EXPENSE_ID') {
      res.status(400).json({ error: 'Trip id is required' });
      return;
    }
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
}

export async function deleteExpenseHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.tripId);
    const expenseId = getParamId(req.params.expenseId);
    await deleteExpense(req.userId!, tripId, expenseId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'INVALID_EXPENSE_ID') {
      res.status(400).json({ error: 'Trip id and expense id are required' });
      return;
    }
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
}