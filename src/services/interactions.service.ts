import { prisma } from '../lib/prisma';
import { InteractionType } from '../generated/prisma/client';

interface CreateInteractionInput {
  userId: string;
  destinationId: string;
  type: InteractionType;
  value?: number;
}

export async function createInteraction(input: CreateInteractionInput) {
  return prisma.interaction.create({ data: input });
}

export async function getUserInteractions(userId: string) {
  return prisma.interaction.findMany({
    where: { userId },
    include: { destination: { select: { slug: true, translations: true } } },
    orderBy: { createdAt: 'desc' },
  });
}