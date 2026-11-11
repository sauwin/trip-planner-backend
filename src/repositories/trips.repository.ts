import { prisma } from '../lib/prisma';

export async function findTripOwnedByUser(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    select: { id: true },
  });
}

export async function findTripDateRangeForUser(userId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, userId },
    select: { startDate: true, endDate: true },
  });
}

export async function createTripRecord(data: {
  userId: string;
  title: string;
  budgetTotal?: number;
  peopleCount: number;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.trip.create({ data });
}

export async function findTripsForUser(userId: string) {
  return prisma.trip.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      destinations: {
        select: { accommodationPrice: true, plannedDateStart: true, plannedDateEnd: true },
      },
      expenses: { select: { amount: true, category: true, date: true } },
    },
  });
}

export async function findTripForUser(userId: string, tripId: string) {
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

export async function deleteTripRecord(tripId: string) {
  return prisma.trip.delete({ where: { id: tripId } });
}

export async function getNextTripDestinationPosition(tripId: string) {
  const result = await prisma.tripDestination.aggregate({
    where: { tripId },
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

export async function createTripDestination(data: {
  tripId: string;
  destinationId: string;
  position: number;
  accommodationName?: string | null;
  accommodationPrice?: number | null;
  accommodationUrl?: string | null;
  plannedDateStart?: Date | null;
  plannedDateEnd?: Date | null;
}) {
  return prisma.tripDestination.create({ data });
}

export async function findTripDestinationDates(tripId: string, destinationId: string) {
  return prisma.tripDestination.findUnique({
    where: { tripId_destinationId: { tripId, destinationId } },
    select: { plannedDateStart: true, plannedDateEnd: true },
  });
}

export async function updateTripDestination(
  tripId: string,
  destinationId: string,
  data: {
    accommodationName?: string | null;
    accommodationPrice?: number | null;
    accommodationUrl?: string | null;
    plannedDateStart?: Date | null;
    plannedDateEnd?: Date | null;
  },
) {
  return prisma.tripDestination.update({
    where: { tripId_destinationId: { tripId, destinationId } },
    data,
  });
}

export async function deleteTripDestination(tripId: string, destinationId: string) {
  return prisma.$transaction(async (transaction) => {
    const deleted = await transaction.tripDestination.deleteMany({ where: { tripId, destinationId } });
    if (deleted.count === 0) return deleted;

    const remaining = await transaction.tripDestination.findMany({
      where: { tripId },
      orderBy: [{ position: 'asc' }, { destinationId: 'asc' }],
      select: { destinationId: true },
    });

    for (const [position, { destinationId: remainingDestinationId }] of remaining.entries()) {
      await transaction.tripDestination.update({
        where: { tripId_destinationId: { tripId, destinationId: remainingDestinationId } },
        data: { position },
      });
    }

    return deleted;
  });
}

export async function findTripDestinationDateRanges(tripId: string) {
  return prisma.tripDestination.findMany({
    where: { tripId },
    select: { plannedDateStart: true, plannedDateEnd: true },
  });
}

interface TripRecordUpdate {
  title?: string;
  budgetTotal?: number | null;
  peopleCount?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}

export async function updateTripAndShiftDestinationDates(
  userId: string,
  tripId: string,
  data: TripRecordUpdate,
  dateOffsetDays: number,
) {
  return prisma.$transaction(async (transaction) => {
    const trip = await transaction.trip.findFirst({
      where: { id: tripId, userId },
      select: { id: true },
    });
    if (!trip) throw new Error('TRIP_NOT_FOUND');

    const destinations = await transaction.tripDestination.findMany({
      where: { tripId },
      select: { destinationId: true, plannedDateStart: true, plannedDateEnd: true },
    });
    const shiftDate = (date: Date | null) => date
      ? new Date(date.getTime() + dateOffsetDays * 24 * 60 * 60 * 1000)
      : null;
    const shiftedDestinations = destinations.map((destination) => ({
      ...destination,
      plannedDateStart: shiftDate(destination.plannedDateStart),
      plannedDateEnd: shiftDate(destination.plannedDateEnd),
    }));

    const datesConflict = shiftedDestinations.some(({ plannedDateStart, plannedDateEnd }) =>
      [plannedDateStart, plannedDateEnd].some((date) =>
        date !== null && (
          (data.startDate && date < data.startDate) ||
          (data.endDate && date > data.endDate)
        ),
      ),
    );
    if (datesConflict) throw new Error('TRIP_DATE_RANGE_CONFLICT');

    for (const destination of shiftedDestinations) {
      await transaction.tripDestination.update({
        where: { tripId_destinationId: { tripId, destinationId: destination.destinationId } },
        data: {
          plannedDateStart: destination.plannedDateStart,
          plannedDateEnd: destination.plannedDateEnd,
        },
      });
    }

    return transaction.trip.update({ where: { id: tripId }, data });
  });
}

export async function updateTripRecord(tripId: string, data: TripRecordUpdate) {
  return prisma.trip.update({ where: { id: tripId }, data });
}
