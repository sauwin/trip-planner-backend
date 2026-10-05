import { prisma } from '../lib/prisma';
import { InteractionType } from '../generated/prisma/client';

export async function createInteraction(
  userId: string,
  destinationId: string,
  type: InteractionType,
  value?: number,
) {
  return prisma.interaction.create({ data: { userId, destinationId, type, value } });
}

export async function replaceInteraction(
  userId: string,
  destinationId: string,
  type: InteractionType,
  value?: number,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.interaction.deleteMany({ where: { userId, destinationId, type } });
    return transaction.interaction.create({ data: { userId, destinationId, type, value } });
  });
}

export async function deleteInteractions(
  userId: string,
  destinationId: string,
  type: InteractionType,
) {
  return prisma.interaction.deleteMany({ where: { userId, destinationId, type } });
}

export async function findUserInteractions(userId: string) {
  return prisma.interaction.findMany({
    where: { userId },
    include: { destination: { select: { slug: true, country: true, translations: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findDestinationInteractions(
  userId: string,
  destinationId: string,
  types: InteractionType[],
) {
  return prisma.interaction.findMany({
    where: { userId, destinationId, type: { in: types } },
  });
}
