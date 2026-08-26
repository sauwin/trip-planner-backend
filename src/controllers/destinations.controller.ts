import { Request, Response } from 'express';
import { getAllDestinations, getDestinationById, createDestination, deleteDestination } from '../services/destinations.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ListDestinationsQuery } from '../schemas/destinations.schema';

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
    const { slug, country, latitude, longitude, translations } = req.body;
    if (!slug || !country || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'slug, country, latitude and longitude are required' });
      return;
    }

    const destination = await createDestination({
      slug,
      country,
      latitude,
      longitude,
      translations: translations || {},
    });
    res.status(201).json(destination);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Destination with this slug already exists' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create destination' });
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
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to delete destination' });
  }
}