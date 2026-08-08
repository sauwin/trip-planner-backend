import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createInteraction, getUserInteractions } from '../services/interactions.service';
import { InteractionType } from '../generated/prisma/client';

const VALID_TYPES = Object.values(InteractionType);

export async function recordInteraction(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId, type, value } = req.body;

    if (!destinationId || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      return;
    }

    const interaction = await createInteraction({
      userId: req.userId!,
      destinationId,
      type,
      value,
    });
    res.status(201).json(interaction);
  } catch (error: any) {
    if (error.code === 'P2003') {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
}

export async function listInteractions(req: AuthenticatedRequest, res: Response) {
  try {
    const interactions = await getUserInteractions(req.userId!);
    res.json(interactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
}