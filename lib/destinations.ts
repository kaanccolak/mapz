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

const normalize = (str: string) =>
  str
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i');

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
  { name: 'Reykjavik', nameTr: 'Reykjavik', country: 'İzlanda', airports: [{ code: 'KEF', name: 'Keflavík' }] },
  { name: 'Edinburgh', nameTr: 'Edinburgh', country: 'İskoçya', airports: [{ code: 'EDI', name: 'Edinburgh' }] },
  { name: 'Dublin', nameTr: 'Dublin', country: 'İrlanda', airports: [{ code: 'DUB', name: 'Dublin' }] },
  { name: 'Bratislava', nameTr: 'Bratislava', country: 'Slovakya', airports: [{ code: 'BTS', name: 'Bratislava' }] },
  { name: 'Ljubljana', nameTr: 'Ljubljana', country: 'Slovenya', airports: [{ code: 'LJU', name: 'Ljubljana' }] },
  { name: 'Riga', nameTr: 'Riga', country: 'Letonya', airports: [{ code: 'RIX', name: 'Riga' }] },
  { name: 'Tallinn', nameTr: 'Tallinn', country: 'Estonya', airports: [{ code: 'TLL', name: 'Lennart Meri' }] },
  { name: 'Vilnius', nameTr: 'Vilnius', country: 'Litvanya', airports: [{ code: 'VNO', name: 'Vilnius' }] },
  { name: 'Thessaloniki', nameTr: 'Selanik', country: 'Yunanistan', airports: [{ code: 'SKG', name: 'Makedonya' }] },
  { name: 'Mykonos', nameTr: 'Mikonos', country: 'Yunanistan', airports: [{ code: 'JMK', name: 'Mykonos' }] },
  { name: 'Santorini', nameTr: 'Santorini', country: 'Yunanistan', airports: [{ code: 'JTR', name: 'Santorini' }] },
  { name: 'Rhodes', nameTr: 'Rodos', country: 'Yunanistan', airports: [{ code: 'RHO', name: 'Diagoras' }] },
  { name: 'Corfu', nameTr: 'Korfu', country: 'Yunanistan', airports: [{ code: 'CFU', name: 'Ioannis Kapodistrias' }] },
  { name: 'Palma de Mallorca', nameTr: 'Palma de Mallorca', country: 'İspanya', airports: [{ code: 'PMI', name: 'Palma de Mallorca' }] },
  { name: 'Ibiza', nameTr: 'İbiza', country: 'İspanya', airports: [{ code: 'IBZ', name: 'Ibiza' }] },
  { name: 'Tenerife', nameTr: 'Tenerife', country: 'İspanya', airports: [{ code: 'TFS', name: 'Tenerife Güney' }] },
  { name: 'Malaga', nameTr: 'Málaga', country: 'İspanya', airports: [{ code: 'AGP', name: 'Málaga' }] },
  { name: 'Valencia', nameTr: 'Valensiya', country: 'İspanya', airports: [{ code: 'VLC', name: 'Valencia' }] },
  { name: 'Seville', nameTr: 'Sevilla', country: 'İspanya', airports: [{ code: 'SVQ', name: 'Sevilla' }] },
  { name: 'Porto', nameTr: 'Porto', country: 'Portekiz', airports: [{ code: 'OPO', name: 'Francisco Sá Carneiro' }] },
  { name: 'Naples', nameTr: 'Napoli', country: 'İtalya', airports: [{ code: 'NAP', name: 'Naples' }] },
  { name: 'Palermo', nameTr: 'Palermo', country: 'İtalya', airports: [{ code: 'PMO', name: 'Palermo' }] },
  { name: 'Catania', nameTr: 'Katanya', country: 'İtalya', airports: [{ code: 'CTA', name: 'Fontanarossa' }] },
  { name: 'Bologna', nameTr: 'Bolonya', country: 'İtalya', airports: [{ code: 'BLQ', name: 'Guglielmo Marconi' }] },
  { name: 'Pisa', nameTr: 'Pisa', country: 'İtalya', airports: [{ code: 'PSA', name: 'Galileo Galilei' }] },
  { name: 'Bari', nameTr: 'Bari', country: 'İtalya', airports: [{ code: 'BRI', name: 'Karol Wojtyła' }] },
  { name: 'Zadar', nameTr: 'Zadar', country: 'Hırvatistan', airports: [{ code: 'ZAD', name: 'Zadar' }] },
  { name: 'Ohrid', nameTr: 'Ohri', country: 'Kuzey Makedonya', airports: [{ code: 'OHD', name: 'Ohrid St. Paul' }] },
  { name: 'Skopje', nameTr: 'Üsküp', country: 'Kuzey Makedonya', airports: [{ code: 'SKP', name: 'Skopje' }] },
  { name: 'Belgrade', nameTr: 'Belgrad', country: 'Sırbistan', airports: [{ code: 'BEG', name: 'Nikola Tesla' }] },
  { name: 'Bucharest', nameTr: 'Bükreş', country: 'Romanya', airports: [{ code: 'OTP', name: 'Henri Coandă' }] },
  { name: 'Sofia', nameTr: 'Sofya', country: 'Bulgaristan', airports: [{ code: 'SOF', name: 'Sofya' }] },
  { name: 'Krakow', nameTr: 'Krakow', country: 'Polonya', airports: [{ code: 'KRK', name: 'John Paul II' }] },
  { name: 'Gdansk', nameTr: 'Gdansk', country: 'Polonya', airports: [{ code: 'GDN', name: 'Lech Wałęsa' }] },
  { name: 'Wroclaw', nameTr: 'Wrocław', country: 'Polonya', airports: [{ code: 'WRO', name: 'Copernicus' }] },
  // Türkiye
  { name: 'Istanbul Sabiha', nameTr: 'İstanbul Sabiha', country: 'Türkiye', airports: [{ code: 'SAW', name: 'Sabiha Gökçen' }] },
  { name: 'Istanbul', nameTr: 'İstanbul', country: 'Türkiye', airports: [{ code: 'IST', name: 'İstanbul Havalimanı' }] },
  { name: 'Ankara', nameTr: 'Ankara', country: 'Türkiye', airports: [{ code: 'ESB', name: 'Esenboğa' }] },
  { name: 'Antalya', nameTr: 'Antalya', country: 'Türkiye', airports: [{ code: 'AYT', name: 'Antalya' }] },
  { name: 'Bodrum', nameTr: 'Bodrum', country: 'Türkiye', airports: [{ code: 'BJV', name: 'Milas-Bodrum' }] },
  { name: 'Dalaman', nameTr: 'Dalaman', country: 'Türkiye', airports: [{ code: 'DLM', name: 'Dalaman' }] },
  { name: 'Izmir', nameTr: 'İzmir', country: 'Türkiye', airports: [{ code: 'ADB', name: 'Adnan Menderes' }] },
  { name: 'Trabzon', nameTr: 'Trabzon', country: 'Türkiye', airports: [{ code: 'TZX', name: 'Trabzon' }] },
  { name: 'Gaziantep', nameTr: 'Gaziantep', country: 'Türkiye', airports: [{ code: 'GZT', name: 'Gaziantep' }] },
  { name: 'Nevsehir', nameTr: 'Nevşehir (Kapadokya)', country: 'Türkiye', airports: [{ code: 'NAV', name: 'Kapadokya' }] },
  // Orta Doğu
  { name: 'Dubai', nameTr: 'Dubai', country: 'BAE', airports: [{ code: 'DXB', name: 'Dubai Uluslararası' }] },
  { name: 'Abu Dhabi', nameTr: 'Abu Dabi', country: 'BAE', airports: [{ code: 'AUH', name: 'Zayed Uluslararası' }] },
  { name: 'Doha', nameTr: 'Doha', country: 'Katar', airports: [{ code: 'DOH', name: 'Hamad Uluslararası' }] },
  { name: 'Muscat', nameTr: 'Maskat', country: 'Umman', airports: [{ code: 'MCT', name: 'Muscat Uluslararası' }] },
  { name: 'Riyadh', nameTr: 'Riyad', country: 'Suudi Arabistan', airports: [{ code: 'RUH', name: 'King Khalid' }] },
  { name: 'Kuwait', nameTr: 'Kuveyt', country: 'Kuveyt', airports: [{ code: 'KWI', name: 'Kuveyt Uluslararası' }] },
  { name: 'Amman', nameTr: 'Amman', country: 'Ürdün', airports: [{ code: 'AMM', name: 'Kraliçe Alia' }] },
  { name: 'Beirut', nameTr: 'Beyrut', country: 'Lübnan', airports: [{ code: 'BEY', name: 'Rafic Hariri' }] },
  { name: 'Tel Aviv', nameTr: 'Tel Aviv', country: 'İsrail', airports: [{ code: 'TLV', name: 'Ben Gurion' }] },
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
  { name: 'Kuala Lumpur', nameTr: 'Kuala Lumpur', country: 'Malezya', airports: [{ code: 'KUL', name: 'KL Uluslararası' }] },
  { name: 'Jakarta', nameTr: 'Cakarta', country: 'Endonezya', airports: [{ code: 'CGK', name: 'Soekarno-Hatta' }] },
  { name: 'Ho Chi Minh City', nameTr: 'Ho Chi Minh', country: 'Vietnam', airports: [{ code: 'SGN', name: 'Tan Son Nhat' }] },
  { name: 'Hanoi', nameTr: 'Hanoi', country: 'Vietnam', airports: [{ code: 'HAN', name: 'Noi Bai' }] },
  { name: 'Da Nang', nameTr: 'Da Nang', country: 'Vietnam', airports: [{ code: 'DAD', name: 'Da Nang' }] },
  { name: 'Chiang Mai', nameTr: 'Chiang Mai', country: 'Tayland', airports: [{ code: 'CNX', name: 'Chiang Mai' }] },
  { name: 'Colombo', nameTr: 'Kolombo', country: 'Sri Lanka', airports: [{ code: 'CMB', name: 'Bandaranaike' }] },
  { name: 'Kathmandu', nameTr: 'Katmandu', country: 'Nepal', airports: [{ code: 'KTM', name: 'Tribhuvan' }] },
  { name: 'Mumbai', nameTr: 'Mumbai', country: 'Hindistan', airports: [{ code: 'BOM', name: 'Chhatrapati Shivaji' }] },
  { name: 'Delhi', nameTr: 'Delhi', country: 'Hindistan', airports: [{ code: 'DEL', name: 'Indira Gandhi' }] },
  { name: 'Goa', nameTr: 'Goa', country: 'Hindistan', airports: [{ code: 'GOI', name: 'Goa Uluslararası' }] },
  { name: 'Taipei', nameTr: 'Taipei', country: 'Tayvan', airports: [{ code: 'TPE', name: 'Taoyuan' }] },
  { name: 'Beijing', nameTr: 'Pekin', country: 'Çin', airports: [{ code: 'PEK', name: 'Başkent Uluslararası' }] },
  { name: 'Shanghai', nameTr: 'Şanghay', country: 'Çin', airports: [{ code: 'PVG', name: 'Pudong' }] },
  // Afrika
  { name: 'Cairo', nameTr: 'Kahire', country: 'Mısır', airports: [{ code: 'CAI', name: 'Kahire Uluslararası' }] },
  { name: 'Marrakech', nameTr: 'Marakeş', country: 'Fas', airports: [{ code: 'RAK', name: 'Menara' }] },
  { name: 'Cape Town', nameTr: 'Cape Town', country: 'Güney Afrika', airports: [{ code: 'CPT', name: 'Cape Town Uluslararası' }] },
  { name: 'Nairobi', nameTr: 'Nairobi', country: 'Kenya', airports: [{ code: 'NBO', name: 'Jomo Kenyatta' }] },
  { name: 'Zanzibar', nameTr: 'Zanzibar', country: 'Tanzanya', airports: [{ code: 'ZNZ', name: 'Zanzibar' }] },
  { name: 'Casablanca', nameTr: 'Kazablanka', country: 'Fas', airports: [{ code: 'CMN', name: 'Mohammed V' }] },
  { name: 'Tunis', nameTr: 'Tunus', country: 'Tunus', airports: [{ code: 'TUN', name: 'Tunus-Carthage' }] },
  { name: 'Johannesburg', nameTr: 'Johannesburg', country: 'Güney Afrika', airports: [{ code: 'JNB', name: 'O. R. Tambo' }] },
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
  { name: 'Toronto', nameTr: 'Toronto', country: 'Kanada', airports: [{ code: 'YYZ', name: 'Pearson' }] },
  { name: 'Vancouver', nameTr: 'Vancouver', country: 'Kanada', airports: [{ code: 'YVR', name: 'Vancouver Uluslararası' }] },
  { name: 'Mexico City', nameTr: 'Meksiko', country: 'Meksika', airports: [{ code: 'MEX', name: 'Benito Juárez' }] },
  { name: 'Bogota', nameTr: 'Bogota', country: 'Kolombiya', airports: [{ code: 'BOG', name: 'El Dorado' }] },
  { name: 'Lima', nameTr: 'Lima', country: 'Peru', airports: [{ code: 'LIM', name: 'Jorge Chávez' }] },
  { name: 'Santiago', nameTr: 'Santiago', country: 'Şili', airports: [{ code: 'SCL', name: 'Arturo Merino Benítez' }] },
  { name: 'Sao Paulo', nameTr: 'São Paulo', country: 'Brezilya', airports: [{ code: 'GRU', name: 'Guarulhos' }] },
  { name: 'Punta Cana', nameTr: 'Punta Cana', country: 'Dominik Cumhuriyeti', airports: [{ code: 'PUJ', name: 'Punta Cana' }] },
  { name: 'Jamaica', nameTr: 'Jamaika', country: 'Jamaika', airports: [{ code: 'MBJ', name: 'Montego Bay (Sangster)' }] },
  // Okyanusya
  { name: 'Sydney', nameTr: 'Sidney', country: 'Avustralya', airports: [{ code: 'SYD', name: 'Kingsford Smith' }] },
  { name: 'Melbourne', nameTr: 'Melbourne', country: 'Avustralya', airports: [{ code: 'MEL', name: 'Melbourne' }] },
  { name: 'Auckland', nameTr: 'Auckland', country: 'Yeni Zelanda', airports: [{ code: 'AKL', name: 'Auckland' }] },
  { name: 'Fiji', nameTr: 'Fiji', country: 'Fiji', airports: [{ code: 'NAN', name: 'Nadi' }] },
];

export const searchDestinations = (query: string): Destination[] => {
  if (query.length < 2) return [];
  const q = normalize(query);

  const cityMatches = DESTINATIONS.filter(
    (d) => normalize(d.name).includes(q) || normalize(d.nameTr).includes(q)
  );

  const countryMatches = DESTINATIONS.filter((d) => normalize(d.country).includes(q));

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
