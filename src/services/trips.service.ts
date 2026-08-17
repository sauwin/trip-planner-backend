import { prisma } from '../lib/prisma';

interface AccommodationInput {
  accommodationName?: string;
  accommodationPrice?: number;
  accommodationUrl?: string;
}

export async function createTrip(
  userId: string,
  title: string,
  budgetTotal?: number,
  peopleCount?: number,
) {
  return prisma.trip.create({
    data: {
      userId,
      title,
      budgetTotal,
      peopleCount: peopleCount ?? 1,
    },
  });
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

export async function deleteTrip(userId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
  return prisma.trip.delete({ where: { id: tripId } });
}

export async function addDestinationToTrip(
  userId: string,
  tripId: string,
  destinationId: string,
  plannedDate?: string,
  accommodation?: AccommodationInput,
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
      ...accommodation,
    },
  });
}

export async function updateAccommodation(
  userId: string,
  tripId: string,
  destinationId: string,
  accommodation: AccommodationInput,
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.tripDestination.update({
    where: { tripId_destinationId: { tripId, destinationId } },
    data: accommodation,
  });
}