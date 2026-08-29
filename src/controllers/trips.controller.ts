import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createTrip, getUserTrips, getTripById, addDestinationToTrip, deleteTrip, updateTripDestinationDetails, deleteDestinationFromTrip, updateTrip } from '../services/trips.service';

function getParamId(value: string | string[]) {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new Error('INVALID_TRIP_ID');
  }

  return id;
}

export async function createTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, budgetTotal, peopleCount, startDate, endDate } = req.body;
    const trip = await createTrip(req.userId!, title, budgetTotal, peopleCount, startDate, endDate);
    res.status(201).json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
}

export async function listTripsHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const trips = await getUserTrips(req.userId!);
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trips' });
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
    if (error instanceof Error && error.message === 'INVALID_TRIP_ID') {
      res.status(400).json({ error: 'Trip id is required' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trip' });
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
  } catch (error: any) {
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Destination already in this trip' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to add destination to trip' });
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
  } catch (error: any) {
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update trip destination details' });
  }
}

export async function deleteTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    await deleteTrip(req.userId!, tripId);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof Error && error.message === 'INVALID_TRIP_ID') {
      res.status(400).json({ error: 'Trip id is required' });
      return;
    }
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete trip' });
  }
}

export async function deleteDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    const destId = getParamId(req.params.destinationId);
    await deleteDestinationFromTrip(req.userId!, tripId, destId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'TRIP_NOT_FOUND') {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    if (error.message === 'DESTINATION_NOT_FOUND') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete destination from trip' });
  }
}

export async function updateTripHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const tripId = getParamId(req.params.id);
    const { title, budgetTotal, peopleCount, startDate, endDate } = req.body;
    const updatedTrip = await updateTrip(req.userId!, tripId, { title, budgetTotal, peopleCount, startDate, endDate });
    res.json(updatedTrip);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
}