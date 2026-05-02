'use client';

import type { HotelSuggestion } from '@/types';

function hotelLink(h: HotelSuggestion): string {
  if (h.bookingUrl) return h.bookingUrl;
  if (h.bookingSearchUrl) return h.bookingSearchUrl;
  const q = encodeURIComponent(h.city);
  return `https://www.booking.com/searchresults.tr.html?ss=${q}`;
}

type AccommodationPlanProps = {
  suggestions: HotelSuggestion[];
};

export function AccommodationPlan({ suggestions }: AccommodationPlanProps) {
  if (!suggestions.length) return null;

  return (
    <section className="border-b border-[#e5e7eb] p-4">
      <h2 className="text-[12px] font-medium uppercase tracking-wide text-[#6b7280]">
        Konaklama planı
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {suggestions.map((h, i) => (
          <li
            key={`${h.city}-${i}`}
            className="rounded-[12px] border border-[#e5e7eb] bg-[#f8f8f7] p-3"
          >
            <p className="text-[15px] font-medium text-[#0a0a0f]">
              {h.city} · {h.nights} gece
            </p>
            {h.category ? (
              <span style={{ fontSize: 11, color: '#5dcaa5' }}>{h.category}</span>
            ) : null}
            <a
              href={hotelLink(h)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex h-9 items-center justify-center rounded-[10px] bg-[#1d9e75] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Otel Bul
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
