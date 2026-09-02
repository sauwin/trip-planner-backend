import { prisma } from '../lib/prisma';
import { InteractionType } from '../generated/prisma/client';

const STATEFUL_TYPES: InteractionType[] = [InteractionType.LIKE, InteractionType.RATING, InteractionType.SAVE];

export async function recordInteraction(userId: string, destinationId: string, type: InteractionType, value?: number) {
  if (STATEFUL_TYPES.includes(type)) {
    return prisma.$transaction(async (tx) => {
      await tx.interaction.deleteMany({ where: { userId, destinationId, type } });
      return tx.interaction.create({ data: { userId, destinationId, type, value } });
    });
  }

  return prisma.interaction.create({ data: { userId, destinationId, type, value } });
}

export async function removeInteraction(userId: string, destinationId: string, type: InteractionType) {
  if (!STATEFUL_TYPES.includes(type)) {
    throw new Error('NOT_REMOVABLE');
  }
  return prisma.interaction.deleteMany({ where: { userId, destinationId, type } });
}

export async function getUserInteractions(userId: string) {
  return prisma.interaction.findMany({
    where: { userId },
    include: { destination: { select: { slug: true, translations: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export interface DestinationInteractionStatus {
  liked: boolean;
  saved: boolean;
  rating: number | null;
}

export async function getDestinationStatus(userId: string, destinationId: string): Promise<DestinationInteractionStatus> {
  const rows = await prisma.interaction.findMany({
    where: { userId, destinationId, type: { in: STATEFUL_TYPES } },
  });

  const rating = rows.find((r) => r.type === InteractionType.RATING);

  return {
    liked: rows.some((r) => r.type === InteractionType.LIKE),
    saved: rows.some((r) => r.type === InteractionType.SAVE),
    rating: rating?.value ?? null,
  };
}