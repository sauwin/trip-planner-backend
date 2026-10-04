import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  destinationFeatureProfiles,
  destinationSecondaryFeatureProfiles,
  recommendationCatalog,
  recommendationCategoryKeys,
  recommendationFeatureKeys,
  type RecommendationFeatureKey,
} from '../src/data/recommendationCatalog';

async function main() {
  const featureIdByKey = new Map<RecommendationFeatureKey, string>();
  const categoryByFeature = new Map<RecommendationFeatureKey, string>();

  for (const category of recommendationCatalog) {
    const savedCategory = await prisma.featureCategory.upsert({
      where: { key: category.key },
      create: { key: category.key, defaultWeight: category.defaultWeight },
      update: { defaultWeight: category.defaultWeight },
    });
    for (const featureKey of category.features) {
      const savedFeature = await prisma.feature.upsert({
        where: { key: featureKey },
        create: { key: featureKey, categoryId: savedCategory.id },
        update: { categoryId: savedCategory.id },
      });
      featureIdByKey.set(featureKey, savedFeature.id);
      categoryByFeature.set(featureKey, category.key);
    }
  }

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
    },
    {
      slug: 'vienna',
      country: 'Austria',
      latitude: 48.20849,
      longitude: 16.37208,
      popularityScore: 0.85,
      translations: {
        sk: { name: 'Viedeň', description: 'Elegantné rakúske hlavné mesto, známe cisárskou architektúrou, klasickou hudbou a kaviarenskou kultúrou.' },
        en: { name: 'Vienna', description: "Austria's elegant capital, known for imperial architecture, classical music, and coffeehouse culture." },
      },
    },
    {
      slug: 'rome',
      country: 'Italy',
      latitude: 41.89193,
      longitude: 12.51133,
      popularityScore: 0.95,
      translations: {
        sk: { name: 'Rím', description: 'Večné mesto s tisícročnou históriou, starovekými ruinami a bohatým umeleckým dedičstvom.' },
        en: { name: 'Rome', description: 'The Eternal City, with millennia of history, ancient ruins, and rich artistic heritage.' },
      },
    },
    {
      slug: 'lisbon',
      country: 'Portugal',
      latitude: 38.72509,
      longitude: -9.1498,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Lisabon', description: 'Prímorské hlavné mesto Portugalska s farebnou architektúrou, kopcami a živou nočnou scénou.' },
        en: { name: 'Lisbon', description: "Portugal's coastal capital, with colorful architecture, hills, and a lively nightlife scene." },
      },
    },
    {
      slug: 'amsterdam',
      country: 'The Netherlands',
      latitude: 52.37403,
      longitude: 4.88969,
      popularityScore: 0.85,
      translations: {
        sk: { name: 'Amsterdam', description: 'Holandské hlavné mesto s kanálmi, múzeami svetovej úrovne a cyklistickou kultúrou.' },
        en: { name: 'Amsterdam', description: "The Dutch capital, with canals, world-class museums, and a strong cycling culture." },
      },
    },
    {
      slug: 'berlin',
      country: 'Germany',
      latitude: 52.52437,
      longitude: 13.41053,
      popularityScore: 0.85,
      translations: {
        sk: { name: 'Berlín', description: 'Nemecké hlavné mesto s bohatou históriou, alternatívnou kultúrou a legendárnym nočným životom.' },
        en: { name: 'Berlin', description: "Germany's capital, with rich history, an alternative culture scene, and legendary nightlife." },
      },
    },
    {
      slug: 'dubrovnik',
      country: 'Croatia',
      latitude: 42.64125,
      longitude: 18.10909,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Dubrovník', description: 'Opevnené prímorské mesto na chorvátskom pobreží, známe stredovekými hradbami a čistým morom.' },
        en: { name: 'Dubrovnik', description: 'A walled coastal city on the Croatian coast, known for its medieval fortifications and clear sea.' },
      },
    },
    {
      slug: 'marrakesh',
      country: 'Morocco',
      latitude: 31.63416,
      longitude: -7.99994,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Marrákeš', description: 'Marocké mesto s farebnými trhmi, historickou medinou a púštnou atmosférou.' },
        en: { name: 'Marrakesh', description: 'A Moroccan city with colorful markets, a historic medina, and a desert atmosphere.' },
      },
    },
    {
      slug: 'cape-town',
      country: 'South Africa',
      latitude: -33.92584,
      longitude: 18.42322,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Kapské Mesto', description: 'Juhoafrické mesto pri Stolovej hore, s plážami, vinicami a bohatou prírodou.' },
        en: { name: 'Cape Town', description: 'A South African city at the foot of Table Mountain, with beaches, vineyards, and rich nature.' },
      },
    },
    {
      slug: 'rio-de-janeiro',
      country: 'Brazil',
      latitude: -22.90642,
      longitude: -43.18223,
      popularityScore: 0.85,
      translations: {
        sk: { name: 'Rio de Janeiro', description: 'Brazílske mesto s ikonickými plážami, karnevalom a horou Corcovado.' },
        en: { name: 'Rio de Janeiro', description: 'A Brazilian city with iconic beaches, carnival, and the Corcovado mountain.' },
      },
    },
    {
      slug: 'new-york',
      country: 'United States',
      latitude: 40.71427,
      longitude: -74.00597,
      popularityScore: 0.95,
      translations: {
        sk: { name: 'New York', description: 'Americká metropola s mrakodrapmi, múzeami a nepretržitým mestským životom.' },
        en: { name: 'New York', description: 'An American metropolis with skyscrapers, museums, and a city that never sleeps.' },
      },
    },
    {
      slug: 'tokyo',
      country: 'Japan',
      latitude: 35.6895,
      longitude: 139.69171,
      popularityScore: 0.9,
      translations: {
        sk: { name: 'Tokio', description: 'Japonské hlavné mesto, kde sa moderná technológia stretáva s tradičnou kultúrou.' },
        en: { name: 'Tokyo', description: "Japan's capital, where modern technology meets traditional culture." },
      },
    },
    {
      slug: 'kyoto',
      country: 'Japan',
      latitude: 35.02107,
      longitude: 135.75385,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Kjóto', description: 'Bývalé japonské hlavné mesto s tisícmi chrámov a tradičnými záhradami.' },
        en: { name: 'Kyoto', description: "Japan's former capital, with thousands of temples and traditional gardens." },
      },
    },
    {
      slug: 'singapore',
      country: 'Singapore',
      latitude: 1.28967,
      longitude: 103.85007,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Singapur', description: 'Mestský štát v juhovýchodnej Ázii, známy čistotou, futuristickou architektúrou a gastronómiou.' },
        en: { name: 'Singapore', description: 'A Southeast Asian city-state known for cleanliness, futuristic architecture, and food culture.' },
      },
    },
    {
      slug: 'ubud',
      country: 'Indonesia',
      latitude: -8.5098,
      longitude: 115.2654,
      popularityScore: 0.7,
      translations: {
        sk: { name: 'Ubud', description: 'Kultúrne srdce Bali, obklopené ryžovými terasami a tropickou prírodou.' },
        en: { name: 'Ubud', description: "Bali's cultural heart, surrounded by rice terraces and tropical nature." },
      },
    },
    {
      slug: 'queenstown',
      country: 'South Africa',
      latitude: -31.89756,
      longitude: 26.87533,
      popularityScore: 0.4,
      translations: {
        sk: { name: 'Queenstown', description: 'Menšie juhoafrické mesto vo vnútrozemí, obľúbené pre pokojnú atmosféru a okolitú prírodu.' },
        en: { name: 'Queenstown', description: 'A smaller inland South African town, valued for its calm atmosphere and surrounding nature.' },
      },
    },
    {
      slug: 'interlaken',
      country: 'Switzerland',
      latitude: 46.68387,
      longitude: 7.86638,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Interlaken', description: 'Švajčiarske mesto medzi dvoma jazerami, brána k Alpám a adrenalínovým športom.' },
        en: { name: 'Interlaken', description: 'A Swiss town between two lakes, the gateway to the Alps and adventure sports.' },
      },
    },
    {
      slug: 'chamonix',
      country: 'France',
      latitude: 45.92375,
      longitude: 6.86933,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Chamonix', description: 'Francúzske horské stredisko pod Mont Blancom, ikona horolezectva a lyžovania.' },
        en: { name: 'Chamonix', description: 'A French mountain resort beneath Mont Blanc, an icon of mountaineering and skiing.' },
      },
    },
    {
      slug: 'whistler',
      country: 'Canada',
      latitude: 50.11817,
      longitude: -122.95396,
      popularityScore: 0.7,
      translations: {
        sk: { name: 'Whistler', description: 'Kanadské horské stredisko, jedno z najväčších lyžiarskych stredísk Severnej Ameriky.' },
        en: { name: 'Whistler', description: 'A Canadian mountain resort, one of the largest ski resorts in North America.' },
      },
    },
    {
      slug: 'cancun',
      country: 'Mexico',
      latitude: 21.17429,
      longitude: -86.84656,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Cancún', description: 'Mexické prímorské letovisko s bielymi plážami a teplým karibským morom.' },
        en: { name: 'Cancún', description: 'A Mexican beach resort with white sand beaches and warm Caribbean waters.' },
      },
    },
    {
      slug: 'phuket',
      country: 'Thailand',
      latitude: 7.89059,
      longitude: 98.3981,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Phuket', description: 'Najväčší thajský ostrov, obľúbený pre pláže, potápanie a nočný život.' },
        en: { name: 'Phuket', description: "Thailand's largest island, popular for beaches, diving, and nightlife." },
      },
    },
    {
      slug: 'dubai',
      country: 'United Arab Emirates',
      latitude: 25.07725,
      longitude: 55.30927,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Dubaj', description: 'Mesto v Spojených arabských emirátoch s mrakodrapmi, nákupmi a luxusnou atmosférou.' },
        en: { name: 'Dubai', description: 'A city in the United Arab Emirates with skyscrapers, shopping, and a luxury atmosphere.' },
      },
    },
    {
      slug: 'cairo',
      country: 'Egypt',
      latitude: 30.06263,
      longitude: 31.24967,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Káhira', description: 'Egyptské hlavné mesto pri pyramídach v Gíze, s tisícročnou históriou.' },
        en: { name: 'Cairo', description: "Egypt's capital near the pyramids of Giza, with millennia of history." },
      },
    },
    {
      slug: 'cusco',
      country: 'Peru',
      latitude: -13.53188,
      longitude: -71.96701,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Cusco', description: 'Bývalé hlavné mesto Incov, východisko k Machu Picchu, v peruánskych Andách.' },
        en: { name: 'Cusco', description: 'The former Incan capital, the gateway to Machu Picchu, in the Peruvian Andes.' },
      },
    },
    {
      slug: 'edinburgh',
      country: 'United Kingdom',
      latitude: 55.95206,
      longitude: -3.19648,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Edinburgh', description: 'Škótske hlavné mesto s hradom, úzkymi uličkami a slávnym letným festivalom.' },
        en: { name: 'Edinburgh', description: "Scotland's capital, with a castle, narrow streets, and a famous summer festival." },
      },
    },
    {
      slug: 'copenhagen',
      country: 'Denmark',
      latitude: 55.67594,
      longitude: 12.56553,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Kodaň', description: 'Dánske hlavné mesto známe dizajnom, cyklistikou a pobrežnou atmosférou.' },
        en: { name: 'Copenhagen', description: "Denmark's capital, known for design, cycling culture, and a coastal atmosphere." },
      },
    },
    {
      slug: 'budapest',
      country: 'Hungary',
      latitude: 47.49835,
      longitude: 19.04045,
      popularityScore: 0.8,
      translations: {
        sk: { name: 'Budapešť', description: 'Maďarské hlavné mesto rozdelené Dunajom, známe kúpeľmi a nočným životom.' },
        en: { name: 'Budapest', description: "Hungary's capital, split by the Danube, known for thermal baths and nightlife." },
      },
    },
    {
      slug: 'krakow',
      country: 'Poland',
      latitude: 50.06143,
      longitude: 19.93658,
      popularityScore: 0.75,
      translations: {
        sk: { name: 'Krakov', description: 'Poľské historické mesto so stredovekým námestím a bohatou kultúrnou ponukou.' },
        en: { name: 'Krakow', description: 'A historic Polish city with a medieval square and rich cultural offerings.' },
      },
    },
    {
      slug: 'ljubljana',
      country: 'Slovenia',
      latitude: 46.05108,
      longitude: 14.50513,
      popularityScore: 0.65,
      translations: {
        sk: { name: 'Ľubľana', description: 'Slovinské hlavné mesto, malé a zelené, s hradom nad riekou Ľubľanicou.' },
        en: { name: 'Ljubljana', description: "Slovenia's capital, small and green, with a castle overlooking the Ljubljanica river." },
      },
    },
  ];

  const destinationIds: string[] = [];
  const destinationFeatureRows: { destinationId: string; featureId: string; weight: number }[] = [];

  for (const data of destinations) {
    const profile = destinationFeatureProfiles[data.slug];

    if (!profile || profile.length !== recommendationCategoryKeys.length) {
      throw new Error(`Invalid recommendation profile for destination: ${data.slug}`);
    }

    const featuresByCategory = new Set<string>();
    const featureLinks = profile.map((featureKey) => {
      const featureId = featureIdByKey.get(featureKey);
      if (!featureId) {
        throw new Error(`Unknown recommendation feature "${featureKey}" for destination: ${data.slug}`);
      }
      const categoryKey = categoryByFeature.get(featureKey);
      if (!categoryKey || featuresByCategory.has(categoryKey)) {
        throw new Error(`Invalid category assignment for "${featureKey}" at destination: ${data.slug}`);
      }
      featuresByCategory.add(categoryKey);
      return { featureId, weight: 0.8 };
    });

    if (featuresByCategory.size !== recommendationCategoryKeys.length) {
      throw new Error(`Incomplete recommendation profile for destination: ${data.slug}`);
    }

    const linksByFeatureId = new Map(featureLinks.map((link) => [link.featureId, link]));
    for (const featureKey of destinationSecondaryFeatureProfiles[data.slug] ?? []) {
      const featureId = featureIdByKey.get(featureKey);
      if (!featureId) {
        throw new Error(`Unknown secondary feature "${featureKey}" for destination: ${data.slug}`);
      }
      if (!linksByFeatureId.has(featureId)) {
        linksByFeatureId.set(featureId, { featureId, weight: 0.55 });
      }
    }

    const destination = await prisma.destination.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
    destinationIds.push(destination.id);
    destinationFeatureRows.push(
      ...[...linksByFeatureId.values()].map(({ featureId, weight }) => ({
        destinationId: destination.id,
        featureId,
        weight,
      })),
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.destinationFeature.deleteMany({
      where: { destinationId: { in: destinationIds } },
    });
    await tx.destinationFeature.createMany({ data: destinationFeatureRows });
  });

  console.log(
    `Seed complete: ${destinations.length} destinations, ${recommendationCategoryKeys.length} categories, ${recommendationFeatureKeys.length} features.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });