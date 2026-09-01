import { prisma } from '../lib/prisma';

interface TripDestinationDetailsInput {
  accommodationName?: string;
  accommodationPrice?: number;
  accommodationUrl?: string;
  plannedDateStart?: string;
  plannedDateEnd?: string;
}

function normalizeDetails(details?: TripDestinationDetailsInput) {
  if (!details) return {};

  const { plannedDateStart, plannedDateEnd, ...rest } = details;

  return {
    ...rest,
    plannedDateStart: plannedDateStart !== undefined ? (plannedDateStart ? new Date(plannedDateStart) : null) : undefined,
    plannedDateEnd: plannedDateEnd !== undefined ? (plannedDateEnd ? new Date(plannedDateEnd) : null) : undefined,
  };
}

export async function createTrip(
  userId: string,
  title: string,
  budgetTotal?: number,
  peopleCount?: number,
  startDate?: string,
  endDate?: string,
) {
  return prisma.trip.create({
    data: {
      userId,
      title,
      budgetTotal,
      peopleCount: peopleCount ?? 1,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });
}

export async function getUserTrips(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      destinations: {
        select: { accommodationPrice: true, plannedDateStart: true, plannedDateEnd: true },
      },
      expenses: {
        select: { amount: true, category: true, date: true },
      },
    },
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
  details?: TripDestinationDetailsInput,
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
      ...normalizeDetails(details),
    },
  });
}

export async function updateTripDestinationDetails(
  userId: string,
  tripId: string,
  destinationId: string,
  details: TripDestinationDetailsInput,
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.tripDestination.update({
    where: { tripId_destinationId: { tripId, destinationId } },
    data: normalizeDetails(details),
  });
}

export async function deleteDestinationFromTrip(userId: string, tripId: string, destinationId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  return prisma.tripDestination.delete({
    where: { tripId_destinationId: { tripId, destinationId } },
  });
}

export async function updateTrip(
  userId: string,
  tripId: string,
  data: Partial<{ title: string; budgetTotal: number; peopleCount: number; startDate: string; endDate: string }>,
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }

  const { startDate, endDate, ...rest } = data;

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });
}