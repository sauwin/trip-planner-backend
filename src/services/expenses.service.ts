import { ExpenseCategory } from '../generated/prisma/client';
import { assertTripOwnership } from '../lib/tripOwnership';
import {
  createExpenseRecord,
  deleteExpenseRecord,
  findTripExpenses,
  updateExpenseRecord,
} from '../repositories/expenses.repository';

export async function createExpense(
  userId: string,
  tripId: string,
  description: string,
  amount: number,
  category?: ExpenseCategory,
  date?: string,
) {
  await assertTripOwnership(userId, tripId);

  return createExpenseRecord({
    tripId,
    description,
    amount,
    category: category ?? ExpenseCategory.OTHER,
    date: date ? new Date(date) : undefined,
  });
}

export async function getTripExpenses(userId: string, tripId: string) {
  await assertTripOwnership(userId, tripId);

  return findTripExpenses(tripId);
}

export async function updateExpense(
  userId: string,
  tripId: string,
  expenseId: string,
  data: { description?: string; amount?: number; category?: ExpenseCategory },
) {
  await assertTripOwnership(userId, tripId);

  return updateExpenseRecord(expenseId, tripId, data);
}

export async function deleteExpense(userId: string, tripId: string, expenseId: string) {
  await assertTripOwnership(userId, tripId);

  return deleteExpenseRecord(expenseId, tripId);
}