import { prisma } from './prisma';

export async function assertTripOwnership(userId: string, tripId: string): Promise<void> {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
}