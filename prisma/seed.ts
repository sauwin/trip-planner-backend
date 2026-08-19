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
      features: [
        { feature: museums, weight: 0.9 },
        { feature: nightlife, weight: 0.6 },
        { feature: cold, weight: 0.5 },
        { feature: budgetHigh, weight: 0.6 },
        { feature: autumn, weight: 0.75 },
        { feature: spring, weight: 0.7 },
      ],
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
      features: [
        { feature: museums, weight: 0.95 },
        { feature: nightlife, weight: 0.6 },
        { feature: warm, weight: 0.6 },
        { feature: budgetHigh, weight: 0.55 },
        { feature: spring, weight: 0.8 },
        { feature: autumn, weight: 0.7 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.7 },
        { feature: museums, weight: 0.6 },
        { feature: coastal, weight: 0.7 },
        { feature: warm, weight: 0.75 },
        { feature: budgetLow, weight: 0.6 },
        { feature: spring, weight: 0.75 },
        { feature: summer, weight: 0.7 },
      ],
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
      features: [
        { feature: museums, weight: 0.85 },
        { feature: nightlife, weight: 0.8 },
        { feature: cold, weight: 0.5 },
        { feature: budgetHigh, weight: 0.6 },
        { feature: spring, weight: 0.75 },
        { feature: summer, weight: 0.65 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.9 },
        { feature: museums, weight: 0.8 },
        { feature: cold, weight: 0.55 },
        { feature: budgetLow, weight: 0.55 },
        { feature: summer, weight: 0.6 },
        { feature: autumn, weight: 0.6 },
      ],
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
      features: [
        { feature: beach, weight: 0.8 },
        { feature: coastal, weight: 0.9 },
        { feature: warm, weight: 0.85 },
        { feature: budgetHigh, weight: 0.5 },
        { feature: summer, weight: 0.9 },
        { feature: spring, weight: 0.6 },
      ],
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
      features: [
        { feature: museums, weight: 0.6 },
        { feature: nightlife, weight: 0.4 },
        { feature: warm, weight: 0.9 },
        { feature: budgetLow, weight: 0.8 },
        { feature: autumn, weight: 0.7 },
        { feature: winter, weight: 0.65 },
      ],
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
      features: [
        { feature: hiking, weight: 0.7 },
        { feature: beach, weight: 0.6 },
        { feature: coastal, weight: 0.85 },
        { feature: mountains, weight: 0.6 },
        { feature: warm, weight: 0.6 },
        { feature: budgetLow, weight: 0.6 },
        { feature: summer, weight: 0.75 },
      ],
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
      features: [
        { feature: beach, weight: 0.9 },
        { feature: nightlife, weight: 0.75 },
        { feature: coastal, weight: 0.9 },
        { feature: mountains, weight: 0.5 },
        { feature: warm, weight: 0.85 },
        { feature: budgetLow, weight: 0.55 },
        { feature: summer, weight: 0.8 },
      ],
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
      features: [
        { feature: museums, weight: 0.9 },
        { feature: nightlife, weight: 0.9 },
        { feature: cold, weight: 0.5 },
        { feature: budgetHigh, weight: 0.85 },
        { feature: autumn, weight: 0.75 },
        { feature: spring, weight: 0.65 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.85 },
        { feature: museums, weight: 0.75 },
        { feature: budgetHigh, weight: 0.7 },
        { feature: cold, weight: 0.4 },
        { feature: spring, weight: 0.85 },
        { feature: autumn, weight: 0.7 },
      ],
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
      features: [
        { feature: museums, weight: 0.9 },
        { feature: hiking, weight: 0.4 },
        { feature: budgetHigh, weight: 0.6 },
        { feature: spring, weight: 0.9 },
        { feature: autumn, weight: 0.85 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.75 },
        { feature: museums, weight: 0.6 },
        { feature: warm, weight: 0.9 },
        { feature: budgetHigh, weight: 0.75 },
        { feature: summer, weight: 0.5 },
      ],
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
      features: [
        { feature: hiking, weight: 0.6 },
        { feature: warm, weight: 0.85 },
        { feature: budgetLow, weight: 0.75 },
        { feature: summer, weight: 0.7 },
      ],
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
      features: [
        { feature: hiking, weight: 0.5 },
        { feature: budgetLow, weight: 0.7 },
        { feature: warm, weight: 0.55 },
        { feature: summer, weight: 0.6 },
      ],
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
      features: [
        { feature: hiking, weight: 0.95 },
        { feature: mountains, weight: 0.95 },
        { feature: budgetHigh, weight: 0.7 },
        { feature: cold, weight: 0.6 },
        { feature: summer, weight: 0.75 },
        { feature: winter, weight: 0.7 },
      ],
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
      features: [
        { feature: hiking, weight: 0.9 },
        { feature: mountains, weight: 0.95 },
        { feature: cold, weight: 0.8 },
        { feature: budgetHigh, weight: 0.65 },
        { feature: winter, weight: 0.9 },
        { feature: summer, weight: 0.6 },
      ],
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
      features: [
        { feature: hiking, weight: 0.7 },
        { feature: mountains, weight: 0.9 },
        { feature: cold, weight: 0.75 },
        { feature: budgetHigh, weight: 0.7 },
        { feature: winter, weight: 0.95 },
        { feature: summer, weight: 0.5 },
      ],
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
      features: [
        { feature: beach, weight: 0.95 },
        { feature: coastal, weight: 0.9 },
        { feature: warm, weight: 0.9 },
        { feature: budgetHigh, weight: 0.55 },
        { feature: winter, weight: 0.85 },
      ],
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
      features: [
        { feature: beach, weight: 0.9 },
        { feature: coastal, weight: 0.85 },
        { feature: warm, weight: 0.9 },
        { feature: budgetLow, weight: 0.75 },
        { feature: winter, weight: 0.85 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.7 },
        { feature: museums, weight: 0.4 },
        { feature: warm, weight: 0.85 },
        { feature: budgetHigh, weight: 0.9 },
        { feature: winter, weight: 0.8 },
      ],
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
      features: [
        { feature: museums, weight: 0.9 },
        { feature: warm, weight: 0.75 },
        { feature: budgetLow, weight: 0.8 },
        { feature: winter, weight: 0.75 },
        { feature: autumn, weight: 0.6 },
      ],
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
      features: [
        { feature: hiking, weight: 0.85 },
        { feature: mountains, weight: 0.8 },
        { feature: budgetLow, weight: 0.65 },
        { feature: cold, weight: 0.5 },
        { feature: winter, weight: 0.7 },
        { feature: summer, weight: 0.4 },
      ],
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
      features: [
        { feature: museums, weight: 0.85 },
        { feature: hiking, weight: 0.4 },
        { feature: cold, weight: 0.6 },
        { feature: budgetHigh, weight: 0.55 },
        { feature: summer, weight: 0.75 },
        { feature: autumn, weight: 0.6 },
      ],
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
      features: [
        { feature: museums, weight: 0.7 },
        { feature: nightlife, weight: 0.6 },
        { feature: cold, weight: 0.55 },
        { feature: budgetHigh, weight: 0.75 },
        { feature: summer, weight: 0.75 },
        { feature: spring, weight: 0.6 },
      ],
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
      features: [
        { feature: nightlife, weight: 0.8 },
        { feature: museums, weight: 0.75 },
        { feature: budgetLow, weight: 0.75 },
        { feature: cold, weight: 0.45 },
        { feature: spring, weight: 0.7 },
        { feature: autumn, weight: 0.65 },
      ],
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
      features: [
        { feature: museums, weight: 0.8 },
        { feature: nightlife, weight: 0.65 },
        { feature: budgetLow, weight: 0.8 },
        { feature: cold, weight: 0.55 },
        { feature: spring, weight: 0.65 },
        { feature: autumn, weight: 0.65 },
      ],
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
      features: [
        { feature: museums, weight: 0.6 },
        { feature: hiking, weight: 0.5 },
        { feature: mountains, weight: 0.4 },
        { feature: budgetLow, weight: 0.7 },
        { feature: cold, weight: 0.45 },
        { feature: spring, weight: 0.7 },
        { feature: summer, weight: 0.65 },
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