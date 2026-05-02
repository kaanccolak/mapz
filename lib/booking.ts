import { peopleToAdults } from '@/lib/iata';
import type { HotelSuggestion, PlanRequest } from '@/types';

export function generateBookingUrl(
  city: string,
  checkin: string,
  checkout: string,
  adults: number,
  totalBudget: number,
  nights: number
): string {
  const n = Math.max(1, nights);
  const accommodationBudget = totalBudget * 0.3;
  const perNightTotal = accommodationBudget / n;
  const perNightEur = Math.round(perNightTotal / 35);
  const minPrice = Math.round(perNightEur * 0.4);
  const maxPrice = perNightEur;

  return `https://www.booking.com/searchresults.tr.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}&price=${minPrice}-${maxPrice}&currency=EUR`;
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

/** Şehir segmentlerine göre check-in/out tarihleri üretir ve Booking arama URL'sini bütçe fiyat filtresiyle doldurur. */
export function assignBookingUrlsToHotelSuggestions(
  hotels: HotelSuggestion[],
  request: PlanRequest
): HotelSuggestion[] {
  if (!hotels?.length) return hotels;
  const digits = request.budget.replace(/\D/g, '');
  const totalBudget = Number(digits) || 0;
  const adults = peopleToAdults(request.people);
  let cursor = request.startDate;

  return hotels.map((h) => {
    const nights = Math.max(1, h.nights);
    const checkin = cursor;
    const checkout = addDaysIso(checkin, nights);
    cursor = checkout;
    const bookingUrl = generateBookingUrl(h.city, checkin, checkout, adults, totalBudget, nights);
    return { ...h, bookingUrl };
  });
}
