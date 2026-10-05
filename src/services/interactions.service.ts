import { InteractionType } from '../generated/prisma/client';
import {
  createInteraction,
  deleteInteractions,
  findDestinationInteractions,
  findUserInteractions,
  replaceInteraction,
} from '../repositories/interactions.repository';

const STATEFUL_TYPES: InteractionType[] = [InteractionType.LIKE, InteractionType.RATING, InteractionType.SAVE];

export async function recordInteraction(userId: string, destinationId: string, type: InteractionType, value?: number) {
  if (STATEFUL_TYPES.includes(type)) {
    return replaceInteraction(userId, destinationId, type, value);
  }

  return createInteraction(userId, destinationId, type, value);
}

export async function removeInteraction(userId: string, destinationId: string, type: InteractionType) {
  if (!STATEFUL_TYPES.includes(type)) {
    throw new Error('NOT_REMOVABLE');
  }
  return deleteInteractions(userId, destinationId, type);
}

export async function getUserInteractions(userId: string) {
  return findUserInteractions(userId);
}

export interface DestinationInteractionStatus {
  liked: boolean;
  saved: boolean;
  rating: number | null;
}

export async function getDestinationStatus(userId: string, destinationId: string): Promise<DestinationInteractionStatus> {
  const rows = await findDestinationInteractions(userId, destinationId, STATEFUL_TYPES);

  const rating = rows.find((r) => r.type === InteractionType.RATING);

  return {
    liked: rows.some((r) => r.type === InteractionType.LIKE),
    saved: rows.some((r) => r.type === InteractionType.SAVE),
    rating: rating?.value ?? null,
  };
}