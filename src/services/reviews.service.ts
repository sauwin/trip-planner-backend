import { ReviewInput } from '../schemas/reviews.schema';
import {
  createDestinationReview,
  deleteDestinationReview,
  findDestinationReviews,
  updateDestinationReview,
} from '../repositories/reviews.repository';

export function getDestinationReviews(destinationId: string, userId: string, offset: number, limit: number) {
  return findDestinationReviews(destinationId, userId, offset, limit);
}

export async function addDestinationReview(userId: string, destinationId: string, input: ReviewInput) {
  return createDestinationReview(userId, destinationId, input);
}

export async function editDestinationReview(userId: string, reviewId: string, input: ReviewInput) {
  return updateDestinationReview(userId, reviewId, input);
}

export async function removeDestinationReview(reviewId: string, userId?: string) {
  return deleteDestinationReview(reviewId, userId);
}
