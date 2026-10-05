import { prisma } from '../lib/prisma';
import { ExpenseCategory } from '../generated/prisma/client';

export async function createExpenseRecord(data: {
  tripId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date?: Date;
}) {
  return prisma.expense.create({ data });
}

export async function findTripExpenses(tripId: string) {
  return prisma.expense.findMany({
    where: { tripId },
    orderBy: { date: 'desc' },
  });
}

export async function updateExpenseRecord(
  expenseId: string,
  tripId: string,
  data: { description?: string; amount?: number; category?: ExpenseCategory },
) {
  return prisma.expense.update({ where: { id: expenseId, tripId }, data });
}

export async function deleteExpenseRecord(expenseId: string, tripId: string) {
  return prisma.expense.delete({ where: { id: expenseId, tripId } });
}
