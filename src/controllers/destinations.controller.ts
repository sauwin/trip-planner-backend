import { Request, Response } from 'express';
import { getAllDestinations, getDestinationById, createDestination, updateDestination, deleteDestination, getSavedDestinations, searchDestinations as searchDestinationRecords } from '../services/destinations.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ListDestinationsQuery, SearchDestinationsQuery } from '../schemas/destinations.schema';
import { handleServiceError } from '../lib/serviceErrors';

export async function listDestinations(req: Request, res: Response) {
  try {
    const { limit, offset, country, featureIds } = (req as Request & { validatedQuery: ListDestinationsQuery }).validatedQuery;
    const result = await getAllDestinations({ limit, offset, country, featureIds });
    res.json(result);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch destinations');
  }
}

export async function searchDestinations(req: Request, res: Response) {
  try {
    const { q, limit, locale } = (req as Request & { validatedQuery: SearchDestinationsQuery }).validatedQuery;
    const items = await searchDestinationRecords(q, limit, locale);
    res.json({ items });
  } catch (error) {
    handleServiceError(error, res, 'Failed to search destinations');
  }
}

export async function getDestination(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const destination = await getDestinationById(id);
    if (!destination) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    res.json(destination);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch destination');
  }
}

export async function createDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const destination = await createDestination(req.body);
    res.status(201).json(destination);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to create destination', {
      P2002: { status: 409, message: 'Destination with this slug already exists' },
      INVALID_DESTINATION_FEATURES: { status: 400, message: 'Destination contains unknown features' },
    });
  }
}

export async function updateDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const destination = await updateDestination(id, req.body);
    res.json(destination);
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to update destination', {
      P2002: { status: 409, message: 'Destination with this slug already exists' },
      P2025: { status: 404, message: 'Destination not found' },
      INVALID_DESTINATION_FEATURES: { status: 400, message: 'Destination contains unknown features' },
    });
  }
}

export async function deleteDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    await deleteDestination(id);
    res.status(204).send();
  } catch (error: unknown) {
    handleServiceError(error, res, 'Failed to delete destination', {
      P2025: { status: 404, message: 'Destination not found' },
    });
  }
}

export async function getSavedDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const savedDestinations = await getSavedDestinations(req.userId!);
    res.status(200).json(savedDestinations);
  } catch (error) {
    handleServiceError(error, res, 'Failed to fetch saved destinations');
  }
}