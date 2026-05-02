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
    <section className="border-b border-[#e5e7eb] px-3 pb-3 pt-2">
      <div
        style={{
          fontSize: 10,
          color: 'rgba(10,10,15,0.35)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        Konaklama
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 0 }}>
        {suggestions.map((h, i) => (
          <div
            key={`${h.city}-${i}`}
            style={{
              padding: '8px 12px',
              background: 'rgba(10,10,15,0.03)',
              border: '0.5px solid rgba(10,10,15,0.1)',
              borderRadius: 8,
              flex: 1,
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{h.city}</div>
            <div style={{ fontSize: 11, color: 'rgba(10,10,15,0.45)' }}>
              {h.nights} gece{h.category ? ` · ${h.category}` : ''}
            </div>
            <a
              href={hotelLink(h)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: '#1d9e75',
                textDecoration: 'none',
                marginTop: 4,
                display: 'block',
              }}
            >
              Otel Bul →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
