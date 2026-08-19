const cities = [
  'Vienna',
  'Rome',
  'Lisbon',
  'Amsterdam',
  'Berlin',
  'Dubrovnik',
  'Marrakesh',
  'Cape Town',
  'Rio de Janeiro',
  'New York',
  'Tokyo',
  'Kyoto',
  'Singapore',
  'Ubud',
  'Queenstown',
  'Interlaken',
  'Chamonix',
  'Whistler',
  'Cancun',
  'Phuket',
  'Dubai',
  'Cairo',
  'Cusco',
  'Edinburgh',
  'Copenhagen',
  'Budapest',
  'Krakow',
  'Ljubljana',
];

async function fetchCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`;
  const res = await fetch(url);
  const data = await res.json();
  const result = data.results?.[0];

  if (!result) {
    console.error(`NOT FOUND: ${name}`);
    return null;
  }

  return {
    name: result.name,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
    population: result.population ?? null,
    timezone: result.timezone,
  };
}

async function main() {
  const results = [];

  for (const city of cities) {
    const data = await fetchCity(city);
    if (data) results.push(data);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log(JSON.stringify(results, null, 2));
}

main();