/// <reference types="node" />

import 'dotenv/config';
import { PoiCategory } from '../src/generated/prisma/client';
import { prisma } from '../src/lib/prisma';

const OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const RADIUS_METERS = 3000;
const MAX_PER_DESTINATION = 12;
const CONCURRENT_DESTINATIONS = 2;
const DELAY_BETWEEN_REQUESTS_MS = 300;
const OVERPASS_RETRIES = 2;
const OVERPASS_REQUEST_TIMEOUT_MS = 30000;
const FAILED_BATCH_DELAY_MS = 5000;

const TAG_CATEGORY_RULES: { tag: string; value: string; category: PoiCategory }[] = [
  { tag: 'tourism', value: 'museum', category: PoiCategory.MUSEUM },
  { tag: 'tourism', value: 'viewpoint', category: PoiCategory.VIEWPOINT },
  { tag: 'tourism', value: 'attraction', category: PoiCategory.ATTRACTION },
  { tag: 'tourism', value: 'gallery', category: PoiCategory.MUSEUM },
  { tag: 'leisure', value: 'park', category: PoiCategory.PARK },
  { tag: 'amenity', value: 'restaurant', category: PoiCategory.RESTAURANT },
  { tag: 'amenity', value: 'cafe', category: PoiCategory.CAFE },
  { tag: 'tourism', value: 'hotel', category: PoiCategory.HOTEL },
  { tag: 'tourism', value: 'hostel', category: PoiCategory.HOTEL },
  { tag: 'tourism', value: 'guest_house', category: PoiCategory.HOTEL },
];

function buildQuery(lat: number, lon: number): string {
  const around = `around:${RADIUS_METERS},${lat},${lon}`;
  const clauses = [
    `node["tourism"~"^(museum|viewpoint|attraction|gallery)$"](${around});`,
    `node["leisure"="park"](${around});`,
    `node["amenity"~"^(restaurant|cafe)$"](${around});`,
    `node["tourism"~"^(hotel|hostel|guest_house)$"](${around});`,
  ].join('\n      ');

  return `
    [out:json][timeout:25];
    (
      ${clauses}
    );
    out body ${MAX_PER_DESTINATION * 10};
  `;
}

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

function categorize(tags: Record<string, string>): PoiCategory {
  for (const rule of TAG_CATEGORY_RULES) {
    if (tags[rule.tag] === rule.value) return rule.category;
  }
  return PoiCategory.OTHER;
}

async function fetchPoiForDestination(lat: number, lon: number) {
  const query = buildQuery(lat, lon);
  let lastError = 'Unknown Overpass error';

  for (const url of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= OVERPASS_RETRIES; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'trip-planner-poi-fetcher/1.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(OVERPASS_REQUEST_TIMEOUT_MS),
        });

        if (res.ok) {
          const data = (await res.json()) as { elements: OverpassElement[] };
          return parsePoiResults(data.elements);
        }

        lastError = `${res.status} ${res.statusText}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      if (attempt < OVERPASS_RETRIES) await sleep(1000);
    }
  }

  throw new Error(`Overpass request failed after retries: ${lastError}`);
}

function parsePoiResults(elements: OverpassElement[]) {
  const named = elements.filter((el) => el.tags?.name);
  const byCategory = new Map<PoiCategory, { name: string; category: PoiCategory; latitude: number; longitude: number }[]>();

  for (const el of named) {
    const name = el.tags!.name;
    const category = categorize(el.tags!);
    const categoryResults = byCategory.get(category) ?? [];
    if (categoryResults.some((result) => result.name === name)) continue;
    categoryResults.push({
      name,
      category,
      latitude: el.lat,
      longitude: el.lon,
    });
    byCategory.set(category, categoryResults);
  }

  const results: { name: string; category: PoiCategory; latitude: number; longitude: number }[] = [];
  const categories = [...byCategory.keys()];
  let index = 0;
  while (results.length < MAX_PER_DESTINATION && categories.length > 0) {
    const category = categories[index % categories.length];
    const categoryResults = byCategory.get(category)!;
    if (categoryResults.length > 0) results.push(categoryResults.shift()!);
    if (categoryResults.length === 0) categories.splice(index % categories.length, 1);
    else index += 1;
  }

  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_PASSES = 3;

async function main() {
  const allPending = await findDestinationsWithoutPoi();
  const succeededIds = new Set<string>();
  let pending = allPending;

  for (let pass = 1; pass <= MAX_PASSES && pending.length > 0; pass += 1) {
    console.log(`Fetching POI for ${pending.length} destinations (pass ${pass}/${MAX_PASSES})...`);

    for (let index = 0; index < pending.length; index += CONCURRENT_DESTINATIONS) {
      const batch = pending.slice(index, index + CONCURRENT_DESTINATIONS);
      await Promise.all(batch.map(async (destination) => {
        try {
          const poi = await fetchPoiForDestination(destination.latitude, destination.longitude);

          await prisma.$transaction([
            prisma.pointOfInterest.deleteMany({ where: { destinationId: destination.id } }),
            prisma.pointOfInterest.createMany({
              data: poi.map((p) => ({ ...p, destinationId: destination.id })),
            }),
          ]);

          succeededIds.add(destination.id);
          console.log(`${destination.slug}: ${poi.length} POI saved${poi.length === 0 ? ' (none found nearby — not an error)' : ''}`);
        } catch (error) {
          console.error(`${destination.slug}: request failed, will retry —`, error);
        }
      }));

      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    pending = pending.filter((d) => !succeededIds.has(d.id));
    if (pending.length > 0 && pass < MAX_PASSES) {
      console.log(`${pending.length} destination(s) failed and will be retried...`);
      await sleep(FAILED_BATCH_DELAY_MS);
    }
  }

  if (pending.length > 0) {
    console.log(`Gave up after ${MAX_PASSES} passes — still failing:`, pending.map((d) => d.slug).join(', '));
  }

  console.log('Done.');
}

function findDestinationsWithoutPoi() {
  return prisma.destination.findMany({
    where: { pointsOfInterest: { none: {} } },
    select: { id: true, slug: true, latitude: true, longitude: true },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());