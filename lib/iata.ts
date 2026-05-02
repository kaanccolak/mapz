import type { PlanRequest } from '@/types';

/** Skyscanner uçuş URL'si için YYMMDD (örn. 2026-09-04 → 260904) */
export function dateToSkyscannerSegment(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '000000';
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

export function peopleToAdults(people: PlanRequest['people']): number {
  switch (people) {
    case 'yalniz':
      return 1;
    case 'cift':
      return 2;
    case 'aile':
      return 4;
    case 'arkadasgrubu':
      return 4;
    default:
      return 2;
  }
}

function norm(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .trim()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

/** Skyscanner /tasima/ucak-bileti için varış IATA (büyük harf) */
const SKY_DESTINATION_IATA: Record<string, string> = {
  podgorica: 'TGD',
  karadag: 'TGD',
  montenegro: 'TGD',
  crna: 'TGD',
  kotor: 'TGD',
  budva: 'TGD',
  tivat: 'TGD',
  bar: 'TGD',
  dubrovnik: 'DBV',
  hirvatistan: 'DBV',
  hrvatska: 'DBV',
  roma: 'FCO',
  italya: 'FCO',
  italy: 'FCO',
  paris: 'CDG',
  fransa: 'CDG',
  france: 'CDG',
  barselona: 'BCN',
  barcelona: 'BCN',
  ispanya: 'BCN',
  spain: 'BCN',
  amsterdam: 'AMS',
  londra: 'LHR',
  london: 'LHR',
  berlin: 'BER',
  prag: 'PRG',
  prague: 'PRG',
  budapeste: 'BUD',
  budapest: 'BUD',
  atina: 'ATH',
  yunanistan: 'ATH',
  greece: 'ATH',
  dubai: 'DXB',
};

function lookupDestination(raw: string): string | undefined {
  const n = norm(raw);
  if (SKY_DESTINATION_IATA[n]) return SKY_DESTINATION_IATA[n];
  for (const [key, code] of Object.entries(SKY_DESTINATION_IATA)) {
    if (n.includes(key) || key.includes(n)) return code;
  }
  return undefined;
}

/** Destinasyon metninden varış havalimanı IATA (büyük harf) */
export function resolveSkyscannerDestinationIATA(destination: string): string {
  const trimmed = destination.trim();
  if (!trimmed) return 'TGD';
  const direct = lookupDestination(trimmed);
  if (direct) return direct;
  const parts = trimmed.split(/[\s,/|]+/).filter(Boolean);
  for (const p of parts) {
    const c = lookupDestination(p);
    if (c) return c;
  }
  return 'TGD';
}

/**
 * Skyscanner Türkiye uçak bileti derin linki (gidiş-dönüş).
 * Örnek: .../ADB/TGD/260904/260911/?adultsv2=2&cabinclass=economy&...
 */
export function buildSkyscannerTasimaUrl(params: {
  departureIata: string;
  destination: string;
  destinationAirportIata?: string;
  startDate: string;
  endDate: string;
  people: PlanRequest['people'];
}): string {
  const origin = params.departureIata.trim().toUpperCase();
  const picked = params.destinationAirportIata?.trim().toUpperCase() ?? '';
  const dest =
    picked.length === 3 && /^[A-Z]{3}$/.test(picked)
      ? picked
      : resolveSkyscannerDestinationIATA(params.destination);
  const out = dateToSkyscannerSegment(params.startDate);
  const inbound = dateToSkyscannerSegment(params.endDate);
  const adults = peopleToAdults(params.people);
  const base = `https://www.skyscanner.com.tr/tasima/ucak-bileti/${origin}/${dest}/${out}/${inbound}/`;
  const qs = new URLSearchParams({
    adultsv2: String(adults),
    cabinclass: 'economy',
    childrenv2: '',
    ref: 'home',
    rtn: '1',
    outboundaltsenabled: 'false',
    inboundaltsenabled: 'false',
    preferdirects: 'false',
  });
  return `${base}?${qs.toString()}`;
}
