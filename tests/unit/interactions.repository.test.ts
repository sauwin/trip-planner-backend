import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    interaction: { findMany: vi.fn() },
    destinationReview: { findMany: vi.fn() },
  },
}));

vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock }));

import { findUserInteractions } from '../../src/repositories/interactions.repository';

describe('findUserInteractions', () => {
  beforeEach(() => {
    prismaMock.interaction.findMany.mockResolvedValue([]);
    prismaMock.destinationReview.findMany.mockResolvedValue([]);
  });

  it('includes reviews as chronologically sorted RATING interactions', async () => {
    const userId = 'user-1';
    const destination = { slug: 'rome', country: 'Italy', translations: {} };
    const interactionCreatedAt = new Date('2026-01-02T00:00:00Z');
    const reviewCreatedAt = new Date('2026-01-03T00:00:00Z');
    prismaMock.interaction.findMany.mockResolvedValue([
      {
        id: 'interaction-1',
        userId,
        destinationId: 'destination-1',
        type: 'LIKE',
        value: null,
        createdAt: interactionCreatedAt,
        destination,
      },
    ]);
    prismaMock.destinationReview.findMany.mockResolvedValue([
      {
        id: 'review-1',
        userId,
        destinationId: 'destination-1',
        rating: 5,
        body: 'Review text stays unchanged.',
        createdAt: reviewCreatedAt,
        destination,
      },
    ]);

    const result = await findUserInteractions(userId);

    expect(result).toEqual([
      {
        id: 'review-1',
        userId,
        destinationId: 'destination-1',
        type: 'RATING',
        value: 5,
        createdAt: reviewCreatedAt,
        destination,
      },
      {
        id: 'interaction-1',
        userId,
        destinationId: 'destination-1',
        type: 'LIKE',
        value: null,
        createdAt: interactionCreatedAt,
        destination,
      },
    ]);
    expect(prismaMock.interaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
    expect(prismaMock.destinationReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });
});
