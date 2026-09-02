import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { recordInteraction, removeInteraction, getUserInteractions, getDestinationStatus } from '../services/interactions.service';
import { InteractionType } from '../generated/prisma/client';

const VALID_TYPES = Object.values(InteractionType);

export async function recordInteractionHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId, type, value } = req.body;

    if (!destinationId || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      return;
    }

    const interaction = await recordInteraction(req.userId!, destinationId, type, value);
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

export async function removeInteractionHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId, type } = req.params;

    if (!VALID_TYPES.includes(type as InteractionType)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      return;
    }

    await removeInteraction(req.userId!, destinationId as string, type as InteractionType);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'NOT_REMOVABLE') {
      res.status(400).json({ error: 'This interaction type cannot be removed' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to remove interaction' });
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

export async function getDestinationStatusHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const { destinationId } = req.params;
    const status = await getDestinationStatus(req.userId!, destinationId as string);
    res.json(status);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch interaction status' });
  }
}