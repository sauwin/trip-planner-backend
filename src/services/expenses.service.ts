import { prisma } from '../lib/prisma';
import { ExpenseCategory } from '../generated/prisma/client';

export async function createExpense(
  userId: string,
  tripId: string,
  description: string,
  amount: number,
  category?: ExpenseCategory,
  date?: string,
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

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
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

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
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.expense.update({
    where: { id: expenseId, tripId },
    data,
  });
}

export async function deleteExpense(userId: string, tripId: string, expenseId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.expense.delete({ where: { id: expenseId, tripId } });
}