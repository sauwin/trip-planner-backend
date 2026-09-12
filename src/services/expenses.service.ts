import { prisma } from '../lib/prisma';
import { ExpenseCategory } from '../generated/prisma/client';
import { assertTripOwnership } from '../lib/tripOwnership';

export async function createExpense(
  userId: string,
  tripId: string,
  description: string,
  amount: number,
  category?: ExpenseCategory,
  date?: string,
) {
  await assertTripOwnership(userId, tripId);

  return prisma.expense.create({
    data: {
      tripId,
      description,
      amount,
      category: category ?? ExpenseCategory.OTHER,
      date: date ? new Date(date) : undefined,
    },
  });
}

export async function getTripExpenses(userId: string, tripId: string) {
  await assertTripOwnership(userId, tripId);

  return prisma.expense.findMany({
    where: { tripId },
    orderBy: { date: 'desc' },
  });
}

export async function updateExpense(
  userId: string,
  tripId: string,
  expenseId: string,
  data: { description?: string; amount?: number; category?: ExpenseCategory },
) {
  await assertTripOwnership(userId, tripId);

  return prisma.expense.update({
    where: { id: expenseId, tripId },
    data,
  });
}

export async function deleteExpense(userId: string, tripId: string, expenseId: string) {
  await assertTripOwnership(userId, tripId);

  return prisma.expense.delete({ where: { id: expenseId, tripId } });
}