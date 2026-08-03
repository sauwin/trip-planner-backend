import { Request, Response } from 'express';
import { getAllDestinations, getDestinationById } from '../services/destinations.service';

export async function listDestinations(req: Request, res: Response) {
  try {
    const destinations = await getAllDestinations();
    res.json(destinations);
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