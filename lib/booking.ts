import type { GroupDetails, HotelSuggestion, PlanRequest } from '@/types';

/** Booking.com arama URL’si (grup, tarih, çocuk yaşları). */
export function buildBookingSearchUrl(
  city: string,
  checkin: string,
  checkout: string,
  gd: GroupDetails,
): string {
  const adults = Math.max(1, gd.adults);
  const rooms = Math.max(1, gd.rooms);
  const children = Math.max(0, gd.children);
  const parts: string[] = [
    `ss=${encodeURIComponent(city)}`,
    'lang=tr',
    `checkin=${checkin}`,
    `checkout=${checkout}`,
    `group_adults=${adults}`,
    `no_rooms=${rooms}`,
    `group_children=${children}`,
  ];
  const ages = gd.childAges.slice(0, children);
  for (let i = 0; i < children; i++) {
    const raw = ages[i];
    const n = typeof raw === 'number' ? raw : Number(raw);
    const age = Number.isFinite(n) ? Math.min(17, Math.max(0, Math.floor(n))) : 8;
    parts.push(`age=${age}`);
  }
  return `https://www.booking.com/searchresults.tr.html?${parts.join('&')}`;
}

function addDaysIso(iso: string, delta: number): string {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((x) => Number.isNaN(x))) return iso;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Şehir segmentlerine göre check-in/out tarihleri üretir ve Booking arama URL’sini doldurur. */
export function assignBookingUrlsToHotelSuggestions(
  hotels: HotelSuggestion[],
  request: PlanRequest,
): HotelSuggestion[] {
  if (!hotels?.length) return hotels;
  const gd = request.groupDetails;
  let cursor = request.startDate;

  return hotels.map((h) => {
    const nights = Math.max(1, h.nights);
    const checkin = cursor;
    const checkout = addDaysIso(checkin, nights);
    cursor = checkout;
    const bookingUrl = buildBookingSearchUrl(h.city, checkin, checkout, gd);
    return { ...h, bookingUrl };
  });
}
