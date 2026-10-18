export function computePopularityScore(reviews: { rating: number }[]): number {
  const ratings = reviews.map((review) => review.rating);
  return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
}