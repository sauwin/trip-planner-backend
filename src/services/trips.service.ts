import { prisma } from '../lib/prisma';
import { assertTripOwnership } from '../lib/tripOwnership';

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
  await assertTripOwnership(userId, tripId);
  return prisma.trip.delete({ where: { id: tripId } });
}

export async function addDestinationToTrip(
  userId: string,
  tripId: string,
  destinationId: string,
  details?: TripDestinationDetailsInput,
) {
  await assertTripOwnership(userId, tripId);

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
  await assertTripOwnership(userId, tripId);

  const existing = await prisma.tripDestination.findUnique({
    where: { tripId_destinationId: { tripId, destinationId } },
    select: { plannedDateStart: true, plannedDateEnd: true },
  });
  if (!existing) throw new Error('DESTINATION_NOT_FOUND');

  const plannedDateStart = details.plannedDateStart === undefined
    ? existing.plannedDateStart
    : details.plannedDateStart ? new Date(details.plannedDateStart) : null;
  const plannedDateEnd = details.plannedDateEnd === undefined
    ? existing.plannedDateEnd
    : details.plannedDateEnd ? new Date(details.plannedDateEnd) : null;
  if (plannedDateStart && plannedDateEnd && plannedDateEnd < plannedDateStart) {
    throw new Error('INVALID_DATE_RANGE');
  }

  return prisma.tripDestination.update({
    where: { tripId_destinationId: { tripId, destinationId } },
    data: normalizeDetails(details),
  });
}

export async function deleteDestinationFromTrip(userId: string, tripId: string, destinationId: string) {
  await assertTripOwnership(userId, tripId);

  const deleted = await prisma.tripDestination.deleteMany({ where: { tripId, destinationId } });
  if (deleted.count === 0) throw new Error('DESTINATION_NOT_FOUND');
  return deleted;
}

export async function updateTrip(
  userId: string,
  tripId: string,
  data: Partial<{ title: string; budgetTotal: number; peopleCount: number; startDate: string; endDate: string }>,
) {
  await assertTripOwnership(userId, tripId);

  const { startDate, endDate, ...rest } = data;
  const existing = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { startDate: true, endDate: true },
  });
  if (!existing) throw new Error('TRIP_NOT_FOUND');

  const nextStartDate = startDate === undefined ? existing.startDate : startDate ? new Date(startDate) : null;
  const nextEndDate = endDate === undefined ? existing.endDate : endDate ? new Date(endDate) : null;
  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      ...rest,
      startDate: startDate === undefined ? undefined : nextStartDate,
      endDate: endDate === undefined ? undefined : nextEndDate,
    },
  });
}