import { prisma } from '../lib/prisma';

export async function getAllDestinations() {
  return prisma.destination.findMany();
}

export async function getDestinationById(id: string) {
  return prisma.destination.findUnique({
    where: { id },
    include: {
      features: {
        include: { feature: true },
      },
    },
  });
}