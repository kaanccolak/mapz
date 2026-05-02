import type { DepartureIata } from '@/types';

/** Form ve API doğrulaması için izin verilen kalkış IATA kodları */
export const ALLOWED_DEPARTURE_IATA: readonly DepartureIata[] = [
  'ADB',
  'SAW',
  'IST',
  'ESB',
  'AYT',
  'BJV',
  'DLM',
  'TZX',
];

export const DEPARTURE_AIRPORT_OPTIONS: { value: DepartureIata; label: string }[] = [
  { value: 'ADB', label: 'İzmir (ADB)' },
  { value: 'SAW', label: 'İstanbul Sabiha Gökçen (SAW)' },
  { value: 'IST', label: 'İstanbul (IST)' },
  { value: 'ESB', label: 'Ankara (ESB)' },
  { value: 'AYT', label: 'Antalya (AYT)' },
  { value: 'BJV', label: 'Bodrum (BJV)' },
  { value: 'DLM', label: 'Dalaman (DLM)' },
  { value: 'TZX', label: 'Trabzon (TZX)' },
];

export function normalizeDepartureIata(raw: unknown): DepartureIata {
  const s = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (ALLOWED_DEPARTURE_IATA.includes(s as DepartureIata)) {
    return s as DepartureIata;
  }
  return 'ADB';
}

/** Eski kayıtlar: metin kalkış → IATA */
export function mapLegacyDepartureToIata(departureCity?: string): DepartureIata {
  if (!departureCity?.trim()) return 'ADB';
  const n = departureCity.toLocaleLowerCase('tr-TR');
  if (n.includes('sabiha') || n.includes('saw')) return 'SAW';
  if (n.includes('istanbul') || n.includes('ist ')) return 'IST';
  if (n.includes('ankara') || n.includes('esb')) return 'ESB';
  if (n.includes('antalya') || n.includes('ayt')) return 'AYT';
  if (n.includes('bodrum') || n.includes('milas') || n.includes('bjv')) return 'BJV';
  if (n.includes('dalaman') || n.includes('dlm')) return 'DLM';
  if (n.includes('trabzon') || n.includes('tzx')) return 'TZX';
  if (n.includes('izmir') || n.includes('adnan') || n.includes('adb')) return 'ADB';
  return 'ADB';
}
