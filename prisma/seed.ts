import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const activity = await prisma.featureCategory.create({ data: { key: 'activity', defaultWeight: 1.0 } });
  const climate = await prisma.featureCategory.create({ data: { key: 'climate', defaultWeight: 0.8 } });
  const budget = await prisma.featureCategory.create({ data: { key: 'budget', defaultWeight: 0.6 } });
  const landscape = await prisma.featureCategory.create({ data: { key: 'landscape', defaultWeight: 0.7 } });
  const season = await prisma.featureCategory.create({ data: { key: 'season', defaultWeight: 0.75 } });

  const hiking = await prisma.feature.create({ data: { key: 'hiking', categoryId: activity.id } });
  const beach = await prisma.feature.create({ data: { key: 'beach', categoryId: activity.id } });
  const nightlife = await prisma.feature.create({ data: { key: 'nightlife', categoryId: activity.id } });
  const museums = await prisma.feature.create({ data: { key: 'museums', categoryId: activity.id } });

  const warm = await prisma.feature.create({ data: { key: 'warm', categoryId: climate.id } });
  const cold = await prisma.feature.create({ data: { key: 'cold', categoryId: climate.id } });

  const budgetLow = await prisma.feature.create({ data: { key: 'budget-low', categoryId: budget.id } });
  const budgetHigh = await prisma.feature.create({ data: { key: 'budget-high', categoryId: budget.id } });

  const mountains = await prisma.feature.create({ data: { key: 'mountains', categoryId: landscape.id } });
  const coastal = await prisma.feature.create({ data: { key: 'coastal', categoryId: landscape.id } });

  const spring = await prisma.feature.create({ data: { key: 'spring', categoryId: season.id } });
  const summer = await prisma.feature.create({ data: { key: 'summer', categoryId: season.id } });
  const autumn = await prisma.feature.create({ data: { key: 'autumn', categoryId: season.id } });
  const winter = await prisma.feature.create({ data: { key: 'winter', categoryId: season.id } });

  const destinations = [
    {
      slug: 'zakopane',
      country: 'Poland',
      latitude: 49.2992,
      longitude: 19.9496,
      popularityScore: 0.7,
      translations: {
        sk: { name: 'Zakopane', description: 'Horské mesto na úpätí Tatier, obľúbené medzi turistami a lyžiarmi.' },
        en: { name: 'Zakopane', description: 'A mountain town at the foot of the Tatras, popular with hikers and skiers.' },
      },
      features: [
        { feature: hiking, weight: 0.9 },
        { feature: mountains, weight: 0.95 },
        { feature: cold, weight: 0.7 },
        { feature: budgetLow, weight: 0.6 },
        { feature: winter, weight: 0.9 },
        { feature: summer, weight: 0.6 },
      ],
    },
    {
      slug: 'barcelona',
      country: 'Spain',
      latitude: 41.3874,
      longitude: 2.1686,
      popularityScore: 0.95,
      translations: {
        sk: { name: 'Barcelona', description: 'Prímorské mesto so slávnou architektúrou, plážami a nočným životom.' },
        en: { name: 'Barcelona', description: 'A coastal city known for its architecture, beaches, and nightlife.' },
      },
      features: [
        { feature: beach, weight: 0.7 },
        { feature: nightlife, weight: 0.9 },
        { feature: museums, weight: 0.8 },
        { feature: warm, weight: 0.8 },
        { feature: coastal, weight: 0.9 },
        { feature: budgetHigh, weight: 0.6 },
        { feature: summer, weight: 0.85 },
        { feature: spring, weight: 0.65 },
      ],
    },
    {
      slug: 'prague',
      country: 'Czechia',
      latitude: 50.0755,
      longitude: 14.4378,
      popularityScore: 0.9,
      translations: {
        sk: { name: 'Praha', description: 'Historické hlavné mesto so silnou kultúrnou a nočnou ponukou.' },
        en: { name: 'Prague', description: 'A historic capital with a strong cultural and nightlife scene.' },
      },
      features: [
        { feature: museums, weight: 0.9 },
        { feature: nightlife, weight: 0.6 },
        { feature: cold, weight: 0.5 },
        { feature: budgetLow, weight: 0.7 },
        { feature: spring, weight: 0.75 },
        { feature: autumn, weight: 0.7 },
      ],
    },
    {
      slug: 'male',
      country: 'Maldives',
      latitude: 4.1755,
      longitude: 73.5093,
      popularityScore: 0.6,
      translations: {
        sk: { name: 'Malé', description: 'Tropický ostrovný raj s plážami a teplým podnebím.' },
        en: { name: 'Malé', description: 'A tropical island paradise with beaches and warm weather.' },
      },
      features: [
        { feature: beach, weight: 0.95 },
        { feature: warm, weight: 0.95 },
        { feature: coastal, weight: 0.9 },
        { feature: budgetHigh, weight: 0.9 },
        { feature: winter, weight: 0.8 },
      ],
    },
    {
      slug: 'reykjavik',
      country: 'Iceland',
      latitude: 64.1466,
      longitude: -21.9426,
      popularityScore: 0.65,
      translations: {
        sk: { name: 'Reykjavík', description: 'Hlavné mesto Islandu, brána k vulkanickej a horskej krajine.' },
        en: { name: 'Reykjavík', description: "Iceland's capital, gateway to volcanic and mountainous landscapes." },
      },
      features: [
        { feature: hiking, weight: 0.7 },
        { feature: mountains, weight: 0.8 },
        { feature: cold, weight: 0.95 },
        { feature: budgetHigh, weight: 0.85 },
        { feature: summer, weight: 0.85 },
        { feature: winter, weight: 0.55 },
      ],
    },
    {
      slug: 'bangkok',
      country: 'Thailand',
      latitude: 13.7563,
      longitude: 100.5018,
      popularityScore: 0.85,
      translations: {
        sk: { name: 'Bangkok', description: 'Rušné hlavné mesto s bohatou pouličnou kultúrou a nočným životom.' },
        en: { name: 'Bangkok', description: 'A bustling capital with rich street culture and nightlife.' },
      },
      features: [
        { feature: nightlife, weight: 0.85 },
        { feature: museums, weight: 0.5 },
        { feature: warm, weight: 0.9 },
        { feature: budgetLow, weight: 0.85 },
        { feature: winter, weight: 0.85 },
      ],
    },
  ];

  for (const { features: featureLinks, ...data } of destinations) {
    const destination = await prisma.destination.create({ data });
    await Promise.all(
      featureLinks.map(({ feature, weight }) =>
        prisma.destinationFeature.create({
          data: { destinationId: destination.id, featureId: feature.id, weight },
        }),
      ),
    );
  }

  console.log('Seed complete: 6 destinations, 5 categories, 14 features.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });