import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    trip: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tripDestination: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { updateTripAndShiftDestinationDates } from '../../src/repositories/trips.repository';

describe('updateTripAndShiftDestinationDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.trip.findFirst.mockResolvedValue({ id: 'trip-1' });
    prismaMock.tripDestination.findMany.mockResolvedValue([{
      destinationId: 'destination-1',
      plannedDateStart: new Date('2026-09-02T00:00:00.000Z'),
      plannedDateEnd: new Date('2026-09-05T00:00:00.000Z'),
    }]);
    prismaMock.tripDestination.update.mockResolvedValue({});
    prismaMock.trip.update.mockResolvedValue({ id: 'trip-1' });
  });

  it('updates trip and itinerary dates in one transaction', async () => {
    const tripUpdate = {
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-10T00:00:00.000Z'),
    };

    await updateTripAndShiftDestinationDates('user-1', 'trip-1', tripUpdate, 61);

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.tripDestination.update).toHaveBeenCalledWith({
      where: { tripId_destinationId: { tripId: 'trip-1', destinationId: 'destination-1' } },
      data: {
        plannedDateStart: new Date('2026-11-02T00:00:00.000Z'),
        plannedDateEnd: new Date('2026-11-05T00:00:00.000Z'),
      },
    });
    expect(prismaMock.trip.update).toHaveBeenCalledWith({
      where: { id: 'trip-1' },
      data: tripUpdate,
    });
  });

  it('rejects a shifted itinerary that no longer fits the new trip range', async () => {
    await expect(updateTripAndShiftDestinationDates('user-1', 'trip-1', {
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-03T00:00:00.000Z'),
    }, 61)).rejects.toThrow('TRIP_DATE_RANGE_CONFLICT');

    expect(prismaMock.tripDestination.update).not.toHaveBeenCalled();
    expect(prismaMock.trip.update).not.toHaveBeenCalled();
  });
});
