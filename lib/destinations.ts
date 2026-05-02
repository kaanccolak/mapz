export type Airport = { code: string; name: string };

/** @deprecated use Airport */
export type DestinationAirport = Airport;

export interface Destination {
  name: string;
  nameTr: string;
  country: string;
  airports: Airport[];
  isCountry?: boolean;
  cities?: Destination[];
}

function dedupeAirports(airports: Airport[]): Airport[] {
  const seen = new Set<string>();
  const out: Airport[] = [];
  for (const a of airports) {
    const c = a.code.trim().toUpperCase();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push({ ...a, code: c });
  }
  return out;
}

function dedupeCitiesByName(cities: Destination[]): Destination[] {
  const byName = new Map<string, Destination>();
  for (const d of cities) {
    if (!byName.has(d.name)) byName.set(d.name, d);
  }
  return Array.from(byName.values());
}

export const DESTINATIONS: Destination[] = [
  // Avrupa
  { name: 'Amsterdam', nameTr: 'Amsterdam', country: 'Hollanda', airports: [{ code: 'AMS', name: 'Schiphol' }] },
  { name: 'Barcelona', nameTr: 'Barselona', country: 'İspanya', airports: [{ code: 'BCN', name: 'El Prat' }] },
  { name: 'Berlin', nameTr: 'Berlin', country: 'Almanya', airports: [{ code: 'BER', name: 'Brandenburg' }] },
  { name: 'Brussels', nameTr: 'Brüksel', country: 'Belçika', airports: [{ code: 'BRU', name: 'Zaventem' }] },
  { name: 'Budapest', nameTr: 'Budapeşte', country: 'Macaristan', airports: [{ code: 'BUD', name: 'Liszt Ferenc' }] },
  { name: 'Copenhagen', nameTr: 'Kopenhag', country: 'Danimarka', airports: [{ code: 'CPH', name: 'Kastrup' }] },
  { name: 'Dubrovnik', nameTr: 'Dubrovnik', country: 'Hırvatistan', airports: [{ code: 'DBV', name: 'Dubrovnik Havalimanı' }] },
  { name: 'Florence', nameTr: 'Floransa', country: 'İtalya', airports: [{ code: 'FLR', name: 'Peretola' }] },
  { name: 'Frankfurt', nameTr: 'Frankfurt', country: 'Almanya', airports: [{ code: 'FRA', name: 'Frankfurt Havalimanı' }] },
  { name: 'Geneva', nameTr: 'Cenevre', country: 'İsviçre', airports: [{ code: 'GVA', name: 'Cenevre Havalimanı' }] },
  { name: 'Athens', nameTr: 'Atina', country: 'Yunanistan', airports: [{ code: 'ATH', name: 'Venizelos' }] },
  { name: 'Helsinki', nameTr: 'Helsinki', country: 'Finlandiya', airports: [{ code: 'HEL', name: 'Vantaa' }] },
  { name: 'Lisbon', nameTr: 'Lizbon', country: 'Portekiz', airports: [{ code: 'LIS', name: 'Humberto Delgado' }] },
  {
    name: 'London',
    nameTr: 'Londra',
    country: 'İngiltere',
    airports: [
      { code: 'LHR', name: 'Heathrow' },
      { code: 'LGW', name: 'Gatwick' },
      { code: 'STN', name: 'Stansted' },
    ],
  },
  { name: 'Madrid', nameTr: 'Madrid', country: 'İspanya', airports: [{ code: 'MAD', name: 'Barajas' }] },
  {
    name: 'Milan',
    nameTr: 'Milano',
    country: 'İtalya',
    airports: [
      { code: 'MXP', name: 'Malpensa' },
      { code: 'LIN', name: 'Linate' },
    ],
  },
  { name: 'Munich', nameTr: 'Münih', country: 'Almanya', airports: [{ code: 'MUC', name: 'Franz Josef Strauss' }] },
  { name: 'Nice', nameTr: 'Nis', country: 'Fransa', airports: [{ code: 'NCE', name: "Côte d'Azur" }] },
  { name: 'Oslo', nameTr: 'Oslo', country: 'Norveç', airports: [{ code: 'OSL', name: 'Gardermoen' }] },
  {
    name: 'Paris',
    nameTr: 'Paris',
    country: 'Fransa',
    airports: [
      { code: 'CDG', name: 'Charles de Gaulle' },
      { code: 'ORY', name: 'Orly' },
    ],
  },
  { name: 'Prague', nameTr: 'Prag', country: 'Çekya', airports: [{ code: 'PRG', name: 'Václav Havel' }] },
  { name: 'Rome', nameTr: 'Roma', country: 'İtalya', airports: [{ code: 'FCO', name: 'Fiumicino' }] },
  { name: 'Split', nameTr: 'Split', country: 'Hırvatistan', airports: [{ code: 'SPU', name: 'Split Havalimanı' }] },
  { name: 'Stockholm', nameTr: 'Stokholm', country: 'İsveç', airports: [{ code: 'ARN', name: 'Arlanda' }] },
  { name: 'Venice', nameTr: 'Venedik', country: 'İtalya', airports: [{ code: 'VCE', name: 'Marco Polo' }] },
  { name: 'Vienna', nameTr: 'Viyana', country: 'Avusturya', airports: [{ code: 'VIE', name: 'Schwechat' }] },
  { name: 'Warsaw', nameTr: 'Varşova', country: 'Polonya', airports: [{ code: 'WAW', name: 'Chopin' }] },
  { name: 'Zurich', nameTr: 'Zürih', country: 'İsviçre', airports: [{ code: 'ZRH', name: 'Zürih Havalimanı' }] },
  { name: 'Sarajevo', nameTr: 'Saraybosna', country: 'Bosna Hersek', airports: [{ code: 'SJJ', name: 'Butmir' }] },
  { name: 'Tirana', nameTr: 'Tiran', country: 'Arnavutluk', airports: [{ code: 'TIA', name: 'Rinas' }] },
  {
    name: 'Kotor',
    nameTr: 'Kotor',
    country: 'Karadağ',
    airports: [
      { code: 'TGD', name: 'Podgorica' },
      { code: 'TIV', name: 'Tivat' },
    ],
  },
  {
    name: 'Montenegro',
    nameTr: 'Karadağ',
    country: 'Karadağ',
    airports: [
      { code: 'TGD', name: 'Podgorica' },
      { code: 'TIV', name: 'Tivat' },
    ],
  },
  {
    name: 'Budva',
    nameTr: 'Budva',
    country: 'Karadağ',
    airports: [
      { code: 'TGD', name: 'Podgorica' },
      { code: 'TIV', name: 'Tivat' },
    ],
  },
  // Orta Doğu
  { name: 'Dubai', nameTr: 'Dubai', country: 'BAE', airports: [{ code: 'DXB', name: 'Dubai Uluslararası' }] },
  { name: 'Abu Dhabi', nameTr: 'Abu Dabi', country: 'BAE', airports: [{ code: 'AUH', name: 'Zayed Uluslararası' }] },
  { name: 'Doha', nameTr: 'Doha', country: 'Katar', airports: [{ code: 'DOH', name: 'Hamad Uluslararası' }] },
  { name: 'Muscat', nameTr: 'Maskat', country: 'Umman', airports: [{ code: 'MCT', name: 'Muscat Uluslararası' }] },
  // Asya
  { name: 'Bali', nameTr: 'Bali', country: 'Endonezya', airports: [{ code: 'DPS', name: 'Ngurah Rai' }] },
  { name: 'Bangkok', nameTr: 'Bangkok', country: 'Tayland', airports: [{ code: 'BKK', name: 'Suvarnabhumi' }] },
  { name: 'Phuket', nameTr: 'Phuket', country: 'Tayland', airports: [{ code: 'HKT', name: 'Phuket Havalimanı' }] },
  {
    name: 'Tokyo',
    nameTr: 'Tokyo',
    country: 'Japonya',
    airports: [
      { code: 'NRT', name: 'Narita' },
      { code: 'HND', name: 'Haneda' },
    ],
  },
  { name: 'Osaka', nameTr: 'Osaka', country: 'Japonya', airports: [{ code: 'KIX', name: 'Kansai' }] },
  { name: 'Singapore', nameTr: 'Singapur', country: 'Singapur', airports: [{ code: 'SIN', name: 'Changi' }] },
  { name: 'Seoul', nameTr: 'Seul', country: 'Güney Kore', airports: [{ code: 'ICN', name: 'Incheon' }] },
  { name: 'Hong Kong', nameTr: 'Hong Kong', country: 'Çin', airports: [{ code: 'HKG', name: 'Hong Kong Uluslararası' }] },
  { name: 'Maldives', nameTr: 'Maldivler', country: 'Maldivler', airports: [{ code: 'MLE', name: 'Velana Uluslararası' }] },
  // Afrika
  { name: 'Cairo', nameTr: 'Kahire', country: 'Mısır', airports: [{ code: 'CAI', name: 'Kahire Uluslararası' }] },
  { name: 'Marrakech', nameTr: 'Marakeş', country: 'Fas', airports: [{ code: 'RAK', name: 'Menara' }] },
  { name: 'Cape Town', nameTr: 'Cape Town', country: 'Güney Afrika', airports: [{ code: 'CPT', name: 'Cape Town Uluslararası' }] },
  // Amerika
  {
    name: 'New York',
    nameTr: 'New York',
    country: 'ABD',
    airports: [
      { code: 'JFK', name: 'John F. Kennedy' },
      { code: 'EWR', name: 'Newark' },
    ],
  },
  { name: 'Miami', nameTr: 'Miami', country: 'ABD', airports: [{ code: 'MIA', name: 'Miami Uluslararası' }] },
  { name: 'Los Angeles', nameTr: 'Los Angeles', country: 'ABD', airports: [{ code: 'LAX', name: 'LAX' }] },
  { name: 'Cancun', nameTr: 'Cancun', country: 'Meksika', airports: [{ code: 'CUN', name: 'Cancun Uluslararası' }] },
  { name: 'Havana', nameTr: 'Havana', country: 'Küba', airports: [{ code: 'HAV', name: 'José Martí' }] },
  { name: 'Buenos Aires', nameTr: 'Buenos Aires', country: 'Arjantin', airports: [{ code: 'EZE', name: 'Ezeiza' }] },
  { name: 'Rio de Janeiro', nameTr: 'Rio de Janeiro', country: 'Brezilya', airports: [{ code: 'GIG', name: 'Galeão' }] },
];

export const searchDestinations = (query: string): Destination[] => {
  if (query.length < 2) return [];
  const q = query.toLowerCase();

  const cityMatches = DESTINATIONS.filter(
    (d) => d.name.toLowerCase().includes(q) || d.nameTr.toLowerCase().includes(q)
  );

  const countryMatches = DESTINATIONS.filter((d) => d.country.toLowerCase().includes(q));

  const countryNames = Array.from(new Set(countryMatches.map((d) => d.country)));
  const countryOptions: Destination[] = countryNames.map((country) => {
    const inCountry = countryMatches.filter((d) => d.country === country);
    const cities = dedupeCitiesByName(inCountry);
    const airports = dedupeAirports(inCountry.flatMap((d) => d.airports));
    return {
      name: country,
      nameTr: country,
      country,
      isCountry: true,
      airports,
      cities,
    };
  });

  const combined: Destination[] = [
    ...countryOptions,
    ...cityMatches.filter((d) => !countryMatches.some((c) => c.name === d.name)),
  ];

  return combined.slice(0, 7);
};
