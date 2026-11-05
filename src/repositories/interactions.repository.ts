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
    const lockKey = JSON.stringify([userId, destinationId, type]);
    await transaction.$queryRaw`
      SELECT 1::int FROM pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `;
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
  const destinationSelect = { select: { slug: true, country: true, translations: true } } as const;
  const [interactions, reviews] = await Promise.all([
    prisma.interaction.findMany({
      where: { userId },
      include: { destination: destinationSelect },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.destinationReview.findMany({
      where: { userId },
      include: { destination: destinationSelect },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return [
    ...interactions,
    ...reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      destinationId: r.destinationId,
      type: InteractionType.RATING,
      value: r.rating,
      createdAt: r.createdAt,
      destination: r.destination,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
