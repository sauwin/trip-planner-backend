import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createTrip, getUserTrips, getTripById, addDestinationToTrip, deleteTrip, updateTripDestinationDetails, deleteDestinationFromTrip, updateTrip } from '../services/trips.service';
import { handleServiceError } from '../lib/serviceErrors';

function getParamId(value: string | string[]) {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new Error('INVALID_TRIP_ID');
  }

  return id;
}

const TRIP_NOT_FOUND = { TRIP_NOT_FOUND: { status: 404, message: 'Trip not found' } };

export async function createTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, budgetTotal, peopleCount, startDate, endDate } = req.body;
    const trip = await createTrip(req.userId!, title, budgetTotal, peopleCount, startDate, endDate);
    res.status(201).json(trip);
  } catch (error) {
    handleServiceError(error, res, 'Failed to create trip');
  }
}

export async function listTripsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const trips = await getUserTrips(req.userId!);
    res.json(trips);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch trips');
  }
}

export async function getTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    const trip = await getTripById(req.userId!, tripId);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(trip);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch trip', {
      INVALID_TRIP_ID: { status: 400, message: 'Trip id is required' },
    });
  }
}

export async function addDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId, plannedDateStart, plannedDateEnd, accommodationName, accommodationPrice, accommodationUrl } = req.body;
    const tripId = getParamId(req.params.id);
    const result = await addDestinationToTrip(req.userId!, tripId, destinationId, {
      plannedDateStart,
      plannedDateEnd,
      accommodationName,
      accommodationPrice,
      accommodationUrl,
    });
    res.status(201).json(result);
  } catch (error) {
    handleServiceError(error, res, 'Failed to add destination to trip', {
      ...TRIP_NOT_FOUND,
      P2003: { status: 404, message: 'Destination not found' },
      P2002: { status: 409, message: 'Destination already in this trip' },
      DESTINATION_DATES_OUTSIDE_TRIP: { status: 400, message: 'Destination dates must be within the trip dates' },
    });
  }
}

export async function updateTripDestinationDetailsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { accommodationName, accommodationPrice, accommodationUrl, plannedDateStart, plannedDateEnd } = req.body;
    const tripId = getParamId(req.params.id);
    const destId = getParamId(req.params.destinationId);
    const result = await updateTripDestinationDetails(req.userId!, tripId, destId, {
      accommodationName,
      accommodationPrice,
      accommodationUrl,
      plannedDateStart,
      plannedDateEnd,
    });
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, 'Failed to update trip destination details', {
      ...TRIP_NOT_FOUND,
      DESTINATION_NOT_FOUND: { status: 404, message: 'Destination not found in this trip' },
      INVALID_DATE_RANGE: { status: 400, message: 'plannedDateEnd must be on or after plannedDateStart' },
      DESTINATION_DATES_OUTSIDE_TRIP: { status: 400, message: 'Destination dates must be within the trip dates' },
    });
  }
}

export async function deleteTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    await deleteTrip(req.userId!, tripId);
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete trip', {
      INVALID_TRIP_ID: { status: 400, message: 'Trip id is required' },
      ...TRIP_NOT_FOUND,
    });
  }
}

export async function deleteDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    const destId = getParamId(req.params.destinationId);
    await deleteDestinationFromTrip(req.userId!, tripId, destId);
    res.status(204).send();
  } catch (error) {
    handleServiceError(error, res, 'Failed to delete destination from trip', {
      ...TRIP_NOT_FOUND,
      DESTINATION_NOT_FOUND: { status: 404, message: 'Destination not found' },
    });
  }
}

export async function updateTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    const { title, budgetTotal, peopleCount, startDate, endDate } = req.body;
    const updatedTrip = await updateTrip(req.userId!, tripId, { title, budgetTotal, peopleCount, startDate, endDate });
    res.json(updatedTrip);
  } catch (error) {
    handleServiceError(error, res, 'Failed to update trip', {
      ...TRIP_NOT_FOUND,
      INVALID_DATE_RANGE: { status: 400, message: 'endDate must be on or after startDate' },
      TRIP_DATE_RANGE_CONFLICT: { status: 400, message: 'Trip dates must include all destination dates' },
    });
  }
}