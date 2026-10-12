import { Request, Response } from 'express';
import { getAllDestinations, getDestinationById, createDestination, updateDestination, deleteDestination, getSavedDestinations, searchDestinations as searchDestinationRecords } from '../services/destinations.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ListDestinationsQuery, SearchDestinationsQuery } from '../schemas/destinations.schema';
import { getErrorCode } from '../lib/serviceErrors';

export async function listDestinations(req: Request, res: Response) {
  try {
    const { limit, offset, country, featureIds } = (req as Request & { validatedQuery: ListDestinationsQuery }).validatedQuery;
    const result = await getAllDestinations({ limit, offset, country, featureIds });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
}

export async function searchDestinations(req: Request, res: Response) {
  try {
    const { q, limit, locale } = (req as Request & { validatedQuery: SearchDestinationsQuery }).validatedQuery;
    const items = await searchDestinationRecords(q, limit, locale);
    res.json({ items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search destinations' });
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
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch destination' });
  }
}

export async function createDestinationHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const destination = await createDestination(req.body);
    res.status(201).json(destination);
  } catch (error: unknown) {
    if (getErrorCode(error) === 'P2002') {
      res.status(409).json({ error: 'Destination with this slug already exists' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_DESTINATION_FEATURES') {
      res.status(400).json({ error: 'Destination contains unknown features' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create destination' });
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
    if (getErrorCode(error) === 'P2002') {
      res.status(409).json({ error: 'Destination with this slug already exists' });
      return;
    }
    if (getErrorCode(error) === 'P2025') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    if (error instanceof Error && error.message === 'INVALID_DESTINATION_FEATURES') {
      res.status(400).json({ error: 'Destination contains unknown features' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update destination' });
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
    if (getErrorCode(error) === 'P2025') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete destination' });
  }
}

export async function getSavedDestination(req: AuthenticatedRequest, res: Response) {
  try {
    const savedDestinations = await getSavedDestinations(req.userId!);
    res.status(200).json(savedDestinations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch saved destinations' }); 
  }
}