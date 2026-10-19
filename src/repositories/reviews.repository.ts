import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import { ReviewInput } from '../schemas/reviews.schema';

const reviewInclude = {
  user: { select: { id: true, name: true } },
};

async function lockDestination(transaction: Prisma.TransactionClient, destinationId: string) {
  await transaction.$queryRaw`
    SELECT "id" FROM "Destination" WHERE "id" = ${destinationId} FOR UPDATE
  `;
}

async function updateDestinationPopularity(transaction: Prisma.TransactionClient, destinationId: string) {
  const summary = await transaction.destinationReview.aggregate({
    where: { destinationId },
    _avg: { rating: true },
  });
  await transaction.destination.update({
    where: { id: destinationId },
    data: { popularityScore: summary._avg.rating ?? 0 },
  });
}

export async function findDestinationReviews(destinationId: string, userId: string, offset: number, limit: number) {
  const [items, ownReview, summary] = await Promise.all([
    prisma.destinationReview.findMany({
      where: { destinationId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.destinationReview.findUnique({
      where: { userId_destinationId: { userId, destinationId } },
      include: reviewInclude,
    }),
    prisma.destinationReview.aggregate({
      where: { destinationId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return {
    items,
    ownReview,
    averageRating: summary._avg.rating,
    total: summary._count._all,
  };
}

export async function createDestinationReview(userId: string, destinationId: string, input: ReviewInput) {
  return prisma.$transaction(async (transaction) => {
    await lockDestination(transaction, destinationId);
    const review = await transaction.destinationReview.create({
      data: {
        userId,
        destinationId,
        ...input,
      },
      include: reviewInclude,
    });
    await updateDestinationPopularity(transaction, destinationId);
    return review;
  });
}

export async function updateDestinationReview(userId: string, reviewId: string, input: ReviewInput) {
  return prisma.$transaction(async (transaction) => {
    const existingReview = await transaction.destinationReview.findFirst({
      where: { id: reviewId, userId },
      select: { destinationId: true },
    });
    if (!existingReview) return null;

    await lockDestination(transaction, existingReview.destinationId);
    const update = await transaction.destinationReview.updateMany({
      where: { id: reviewId, userId },
      data: input,
    });
    if (!update.count) return null;
    const review = await transaction.destinationReview.findUniqueOrThrow({
      where: { id: reviewId },
      include: reviewInclude,
    });
    await updateDestinationPopularity(transaction, existingReview.destinationId);
    return review;
  });
}

export async function deleteDestinationReview(reviewId: string, userId?: string) {
  return prisma.$transaction(async (transaction) => {
    const existingReview = await transaction.destinationReview.findFirst({
      where: { id: reviewId, ...(userId ? { userId } : {}) },
      select: { destinationId: true },
    });
    if (!existingReview) return 0;

    await lockDestination(transaction, existingReview.destinationId);
    const result = await transaction.destinationReview.deleteMany({
      where: { id: reviewId, ...(userId ? { userId } : {}) },
    });
    if (result.count) {
      await updateDestinationPopularity(transaction, existingReview.destinationId);
    }
    return result.count;
  });
}
