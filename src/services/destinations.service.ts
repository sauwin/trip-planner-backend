import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export interface ListDestinationsParams {
  limit: number;
  offset: number;
  country?: string;
  featureIds?: string[];
}

export async function getAllDestinations({ limit, offset, country, featureIds }: ListDestinationsParams) {
  const conditions: Prisma.DestinationWhereInput[] = [];
  if (country) conditions.push({ country });
  if (featureIds && featureIds.length > 0) {
    conditions.push(...featureIds.map((featureId) => ({ features: { some: { featureId } } })));
  }
  const where = conditions.length > 0 ? { AND: conditions } : undefined;

  const [items, total] = await Promise.all([
    prisma.destination.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { popularityScore: 'desc' },
    }),
    prisma.destination.count({ where }),
  ]);

  return { items, total, limit, offset };
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