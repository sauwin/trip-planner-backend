import { prisma } from '../lib/prisma';

export async function createTrip(userId: string, title: string) {
  return prisma.trip.create({ data: { userId, title } });
}

export async function getUserTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTripById(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    include: {
      destinations: {
        orderBy: { position: 'asc' },
        include: { destination: true },
      },
    },
  });
}

export async function addDestinationToTrip(
  userId: string,
  tripId: string,
  destinationId: string,
  plannedDate?: string,
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  const lastPosition = await prisma.tripDestination.count({ where: { tripId } });

  return prisma.tripDestination.create({
    data: {
      tripId,
      destinationId,
      position: lastPosition,
      plannedDate: plannedDate ? new Date(plannedDate) : null,
    },
  });
}

export async function deleteTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
  return prisma.trip.delete({ where: { id: tripId } });
}