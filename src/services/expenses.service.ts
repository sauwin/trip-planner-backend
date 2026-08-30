import { prisma } from '../lib/prisma';

export async function createExpense(userId: string, tripId: string, description: string, amount: number, date?: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.expense.create({
    data: {
      tripId,
      description,
      amount,
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

export async function deleteExpense(userId: string, tripId: string, expenseId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.expense.delete({ where: { id: expenseId, tripId } });
}

export async function updateExpense(
  userId: string,
  tripId: string,
  expenseId: string,
  data: { description?: string; amount?: number },
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