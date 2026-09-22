export function computePopularityScore(interactions: { value: number | null }[]): number {
  const ratings = interactions.map((interaction) => interaction.value).filter((value): value is number => value !== null);
  return ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
}