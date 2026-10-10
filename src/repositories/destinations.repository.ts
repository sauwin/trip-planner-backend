import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';

export const DESTINATION_FEATURES_INCLUDE = {
  features: { include: { feature: { include: { category: true } } } },
  interactions: { where: { type: 'RATING' }, select: { value: true } },
} satisfies Prisma.DestinationInclude;

export interface DestinationFilters {
  country?: string;
  featureIds?: string[];
}

export async function findDestinations({ country, featureIds }: DestinationFilters) {
  const conditions: Prisma.DestinationWhereInput[] = [];
  if (country) conditions.push({ country });

  if (featureIds?.length) {
    const features = await prisma.feature.findMany({
      where: { id: { in: featureIds } },
      select: { id: true, categoryId: true },
    });
    const featureCategories = new Map(features.map((feature) => [feature.id, feature.categoryId]));
    const featureIdsByCategory = new Map<string, string[]>();

    for (const featureId of featureIds) {
      const categoryId = featureCategories.get(featureId) ?? `unknown:${featureId}`;
      const selectedIds = featureIdsByCategory.get(categoryId) ?? [];
      selectedIds.push(featureId);
      featureIdsByCategory.set(categoryId, selectedIds);
    }

    conditions.push(
      ...[...featureIdsByCategory.values()].map((selectedIds) => ({
        features: { some: { featureId: { in: selectedIds } } },
      })),
    );
  }

  const where = conditions.length > 0 ? { AND: conditions } : undefined;
  const [items, total] = await Promise.all([
    prisma.destination.findMany({ where, include: DESTINATION_FEATURES_INCLUDE }),
    prisma.destination.count({ where }),
  ]);

  return { items, total };
}

export interface DestinationSearchResult {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string | null;
  image: string | null;
}

function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function getSearchTranslations(translations: Prisma.JsonValue) {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) return [];

  return Object.entries(translations).flatMap(([locale, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.name !== 'string') return [];
    const region = typeof value.region === 'string' ? value.region : typeof value.state === 'string' ? value.state : null;
    const image = typeof value.image === 'string'
      ? value.image
      : typeof value.imageUrl === 'string'
        ? value.imageUrl
        : typeof value.thumbnail === 'string'
          ? value.thumbnail
          : null;
    return [{ locale, name: value.name, region, image }];
  });
}

function getSearchRank(value: string, query: string) {
  const normalizedValue = normalizeSearchText(value);
  if (normalizedValue === query) return 0;
  const words = normalizedValue.split(/[\s\p{P}]+/u);
  if (normalizedValue.startsWith(query) || words.some((word) => word.startsWith(query))) return 1;
  return normalizedValue.includes(query) ? 2 : null;
}

export async function searchDestinations(query: string, limit: number, locale: string) {
  const normalizedQuery = normalizeSearchText(query.trim());
  const destinations = await prisma.destination.findMany({
    select: { id: true, slug: true, country: true, translations: true },
  });
  const bestMatches = new Map<string, DestinationSearchResult & { rank: number; localeRank: number }>();

  for (const destination of destinations) {
    const translations = getSearchTranslations(destination.translations);
    const candidates = translations.length > 0
      ? translations
      : [{ locale: 'en', name: destination.slug, region: null, image: null }];

    for (const translation of candidates) {
      const rank = [translation.name, destination.country, translation.region ?? '', destination.slug]
        .map((value) => getSearchRank(value, normalizedQuery))
        .reduce<number | null>((best, value) => value === null ? best : best === null ? value : Math.min(best, value), null);
      if (rank === null) continue;

      const localeRank = translation.locale === locale ? 0 : translation.locale === 'en' ? 1 : 2;
      const currentMatch = bestMatches.get(destination.id);
      if (currentMatch && (currentMatch.rank < rank || (currentMatch.rank === rank && currentMatch.localeRank <= localeRank))) {
        continue;
      }

      bestMatches.set(destination.id, {
        id: destination.id,
        slug: destination.slug,
        name: translation.name,
        country: destination.country,
        region: translation.region,
        image: translation.image,
        rank,
        localeRank,
      });
    }
  }

  return [...bestMatches.values()]
    .sort((left, right) => left.rank - right.rank || left.localeRank - right.localeRank || left.name.localeCompare(right.name))
    .slice(0, limit)
    .map(({ rank: _rank, localeRank: _localeRank, ...destination }) => destination);
}

export async function findDestinationById(id: string) {
  return prisma.destination.findUnique({
    where: { id },
    include: DESTINATION_FEATURES_INCLUDE,
  });
}

export interface CreateDestinationData {
  slug: string;
  country: string;
  latitude: number;
  longitude: number;
  translations: Prisma.InputJsonValue;
}

export async function createDestination(data: CreateDestinationData) {
  return prisma.destination.create({ data });
}

export async function deleteDestination(id: string) {
  return prisma.destination.delete({ where: { id } });
}

export async function findSavedDestinations(userId: string) {
  return prisma.destination.findMany({
    where: { interactions: { some: { userId, type: 'SAVE' } } },
  });
}
