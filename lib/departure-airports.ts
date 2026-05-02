import type { DepartureIata } from '@/types';

/** Form ve API doğrulaması için izin verilen kalkış IATA kodları */
export const ALLOWED_DEPARTURE_IATA: readonly DepartureIata[] = [
  'ADB',
  'ADF',
  'AFY',
  'AJI',
  'AOE',
  'ASR',
  'AYT',
  'BAL',
  'BJV',
  'BOL',
  'BXN',
  'BZI',
  'CKZ',
  'COV',
  'DLM',
  'DIY',
  'EDO',
  'ESB',
  'ERC',
  'ERZ',
  'GKD',
  'GNY',
  'GZP',
  'GZT',
  'HTY',
  'IGD',
  'ISE',
  'IST',
  'KCM',
  'KFS',
  'KSY',
  'KZR',
  'KYA',
  'MLX',
  'MQM',
  'MSR',
  'MZH',
  'NAV',
  'NOP',
  'OGU',
  'ONQ',
  'RTE',
  'RZV',
  'SAW',
  'SFQ',
  'SIC',
  'SZF',
  'TEQ',
  'TEV',
  'TJK',
  'TZX',
  'USQ',
  'VAN',
  'VAS',
  'YEI',
] as const;

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
