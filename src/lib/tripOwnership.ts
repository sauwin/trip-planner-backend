import { findTripOwnedByUser } from '../repositories/trips.repository';

export async function assertTripOwnership(userId: string, tripId: string): Promise<void> {
  const trip = await findTripOwnedByUser(userId, tripId);
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
}