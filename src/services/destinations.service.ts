import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

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

export async function createDestination(data: { slug: string; country: string; latitude: number; longitude: number; translations: Prisma.InputJsonValue; }) {
  return prisma.destination.create({ data });
}

export async function deleteDestination(id: string) {
  return prisma.destination.delete({ where: { id } });
}