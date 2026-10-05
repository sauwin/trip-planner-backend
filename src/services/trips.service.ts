import { assertTripOwnership } from '../lib/tripOwnership';
import {
  countTripDestinations,
  createTripDestination,
  createTripRecord,
  deleteTripDestination,
  deleteTripRecord,
  findTripDateRange,
  findTripDestinationDateRanges,
  findTripDestinationDates,
  findTripForUser,
  findTripsForUser,
  updateTripDestination,
  updateTripRecord,
} from '../repositories/trips.repository';

interface TripDestinationDetailsInput {
  accommodationName?: string | null;
  accommodationPrice?: number | null;
  accommodationUrl?: string | null;
  plannedDateStart?: string | null;
  plannedDateEnd?: string | null;
}

function normalizeDetails(details?: TripDestinationDetailsInput): {
  accommodationName?: string | null;
  accommodationPrice?: number | null;
  accommodationUrl?: string | null;
  plannedDateStart?: Date | null;
  plannedDateEnd?: Date | null;
} {
  if (!details) return {};

  const { plannedDateStart, plannedDateEnd, ...rest } = details;

  return {
    ...rest,
    plannedDateStart: plannedDateStart !== undefined ? (plannedDateStart ? new Date(plannedDateStart) : null) : undefined,
    plannedDateEnd: plannedDateEnd !== undefined ? (plannedDateEnd ? new Date(plannedDateEnd) : null) : undefined,
  };
}

async function assertDestinationDatesWithinTrip(
  tripId: string,
  plannedDateStart: Date | null,
  plannedDateEnd: Date | null,
) {
  const trip = await findTripDateRange(tripId);

  if (!trip) throw new Error('TRIP_NOT_FOUND');
  if (
    (trip.startDate && plannedDateStart && plannedDateStart < trip.startDate) ||
    (trip.endDate && plannedDateEnd && plannedDateEnd > trip.endDate)
  ) {
    throw new Error('DESTINATION_DATES_OUTSIDE_TRIP');
  }
}

export async function createTrip(
  userId: string,
  title: string,
  budgetTotal?: number,
  peopleCount?: number,
  startDate?: string,
  endDate?: string,
) {
  return createTripRecord({
    userId,
    title,
    budgetTotal,
    peopleCount: peopleCount ?? 1,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
}

export async function getUserTrips(userId: string) {
  return findTripsForUser(userId);
}

export async function getTripById(userId: string, tripId: string) {
  return findTripForUser(userId, tripId);
}

export async function deleteTrip(userId: string, tripId: string) {
  await assertTripOwnership(userId, tripId);
  return deleteTripRecord(tripId);
}

export async function addDestinationToTrip(
  userId: string,
  tripId: string,
  destinationId: string,
  details?: TripDestinationDetailsInput,
) {
  await assertTripOwnership(userId, tripId);

  const normalized = normalizeDetails(details);
  await assertDestinationDatesWithinTrip(
    tripId,
    normalized.plannedDateStart ?? null,
    normalized.plannedDateEnd ?? null,
  );

  const lastPosition = await countTripDestinations(tripId);

  return createTripDestination({
    tripId,
    destinationId,
    position: lastPosition,
    ...normalized,
  });
}

export async function updateTripDestinationDetails(
  userId: string,
  tripId: string,
  destinationId: string,
  details: TripDestinationDetailsInput,
) {
  await assertTripOwnership(userId, tripId);

  const existing = await findTripDestinationDates(tripId, destinationId);
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
  await assertDestinationDatesWithinTrip(tripId, plannedDateStart, plannedDateEnd);

  return updateTripDestination(tripId, destinationId, normalizeDetails(details));
}

export async function deleteDestinationFromTrip(userId: string, tripId: string, destinationId: string) {
  await assertTripOwnership(userId, tripId);

  const deleted = await deleteTripDestination(tripId, destinationId);
  if (deleted.count === 0) throw new Error('DESTINATION_NOT_FOUND');
  return deleted;
}

export async function updateTrip(
  userId: string,
  tripId: string,
  data: Partial<{ title: string; budgetTotal: number | null; peopleCount: number; startDate: string | null; endDate: string | null }>,
) {
  await assertTripOwnership(userId, tripId);

  const { startDate, endDate, ...rest } = data;
  const existing = await findTripDateRange(tripId);
  if (!existing) throw new Error('TRIP_NOT_FOUND');

  const nextStartDate = startDate === undefined ? existing.startDate : startDate ? new Date(startDate) : null;
  const nextEndDate = endDate === undefined ? existing.endDate : endDate ? new Date(endDate) : null;
  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  const destinations = await findTripDestinationDateRanges(tripId);
  const hasDestinationOutsideRange = destinations.some((destination) =>
    (nextStartDate && destination.plannedDateStart && destination.plannedDateStart < nextStartDate) ||
    (nextEndDate && destination.plannedDateEnd && destination.plannedDateEnd > nextEndDate),
  );
  if (hasDestinationOutsideRange) {
    throw new Error('TRIP_DATE_RANGE_CONFLICT');
  }

  return updateTripRecord(tripId, {
    ...rest,
    startDate: startDate === undefined ? undefined : nextStartDate,
    endDate: endDate === undefined ? undefined : nextEndDate,
  });
}