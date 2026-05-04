'use client';

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';

export type PlacePanelMarker = {
  name: string;
  lat: number;
  lng: number;
  time: string;
  duration: string;
  sequence: number;
  /** Claude planındaki aktivite açıklaması (editorial_summary yoksa kullanılır) */
  activityDescription?: string;
};

type PlaceResult = {
  place_id?: string;
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  price_level?: number;
  editorial_summary?: {
    overview?: string;
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: { photo_reference?: string }[];
  reviews?: {
    author_name?: string;
    rating?: number;
    text?: string;
  }[];
};

type DetailState = { kind: 'ok'; result: PlaceResult } | { kind: 'fallback' } | null;

/** Önbellekte saklanan Places detay yanıtı (null değil) */
export type PlaceDetails = Exclude<DetailState, null>;

function coordCacheKey(marker: PlacePanelMarker): string {
  const lat = Number(marker.lat);
  const lng = Number(marker.lng);
  const name = marker.name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return `invalid::${name}`;
  }
  return `${lat.toFixed(5)},${lng.toFixed(5)}::${name}`;
}

function placeIdCacheKey(placeId: string): string {
  return `place_id:${placeId}`;
}

function storePlaceDetails(
  cache: Map<string, PlaceDetails>,
  coordKey: string,
  value: PlaceDetails,
  placeIdForAlias?: string,
): void {
  cache.set(coordKey, value);
  if (placeIdForAlias && value.kind === 'ok') {
    cache.set(placeIdCacheKey(placeIdForAlias), value);
  }
}

function priceLevelLabel(level?: number): string {
  if (level == null || level < 0) return '';
  if (level <= 1) return '€';
  if (level === 2) return '€€';
  return '€€€';
}

/** Dolu (★) / boş (☆) — 0–5 arası yuvarlanmış tam yıldız sayısı */
function starsRow(rating: number): string {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.round(r);
  return `${'★'.repeat(full)}${'☆'.repeat(5 - full)}`;
}

function reviewStarsRow(rating: number): string {
  const r = Math.max(0, Math.min(5, rating));
  const full = Math.round(r);
  return `${'★'.repeat(full)}${'☆'.repeat(5 - full)}`;
}

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function todayHoursLine(weekdayText?: string[]): string | null {
  if (!weekdayText?.length) return null;
  const today = TR_DAYS[new Date().getDay()];
  const line = weekdayText.find((w) => w.trim().startsWith(today));
  return line ?? null;
}

type PhotoCarouselProps = {
  photos: { photo_reference: string }[];
  roundedTopClass: string;
  onClose: () => void;
  resetKey: string;
};

const arrowBtnClass =
  'absolute top-1/2 z-[15] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(0,0,0,0.5)] text-[17px] font-bold leading-none text-white opacity-0 shadow-sm transition-[opacity,background-color] duration-200 group-hover/carousel:opacity-100 max-md:opacity-100 hover:bg-[rgba(0,0,0,0.72)]';

function PhotoCarousel({ photos, roundedTopClass, onClose, resetKey }: PhotoCarouselProps) {
  const [active, setActive] = useState(0);
  const n = photos.length;
  const touchStartXRef = useRef(0);

  useEffect(() => {
    setActive(0);
  }, [resetKey]);

  const goTo = useCallback((index: number) => {
    if (n <= 0) return;
    setActive(Math.min(n - 1, Math.max(0, index)));
  }, [n]);

  const onCarouselTouchStart = useCallback((e: TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const onCarouselTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (n <= 1) return;
      const endX = e.changedTouches[0]?.clientX;
      if (endX == null) return;
      const diff = touchStartXRef.current - endX;
      if (diff > 50) {
        setActive((prev) => Math.min(n - 1, prev + 1));
      } else if (diff < -50) {
        setActive((prev) => Math.max(0, prev - 1));
      }
    },
    [n],
  );

  const pct = n > 0 ? (active / n) * 100 : 0;

  return (
    <div
      className={`group/carousel relative h-[200px] w-full shrink-0 overflow-hidden ${roundedTopClass}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[15px] font-medium leading-none text-white backdrop-blur-sm transition hover:bg-white/30"
        aria-label="Kapat"
      >
        ✕
      </button>

      {n > 0 ? (
        <>
          <div
            className="relative h-full w-full touch-manipulation overflow-hidden"
            onTouchStart={onCarouselTouchStart}
            onTouchEnd={onCarouselTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{
                width: `${n * 100}%`,
                transform: `translateX(-${pct}%)`,
              }}
            >
              {photos.map((p, i) => (
                <div
                  key={`${p.photo_reference}-${i}`}
                  className="h-full shrink-0"
                  style={{ width: `${100 / n}%` }}
                >
                  <img
                    src={`/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}&maxwidth=500`}
                    alt=""
                    className="h-full w-full object-cover [image-rendering:crisp-edges]"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {n > 1 ? (
            <>
              {active > 0 ? (
                <button
                  type="button"
                  aria-label="Önceki fotoğraf"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(active - 1);
                  }}
                  className={`${arrowBtnClass} left-2`}
                >
                  ‹
                </button>
              ) : null}
              {active < n - 1 ? (
                <button
                  type="button"
                  aria-label="Sonraki fotoğraf"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(active + 1);
                  }}
                  className={`${arrowBtnClass} right-2`}
                >
                  ›
                </button>
              ) : null}
              <div
                className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-2"
                role="tablist"
                aria-label="Fotoğraflar"
              >
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Fotoğraf ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      goTo(i);
                    }}
                    className={`pointer-events-auto h-2 w-2 rounded-full transition-transform ${
                      i === active ? 'scale-110 bg-white' : 'bg-white/35 hover:bg-white/55'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#1d9e75]/35 to-[#13131a]" />
      )}
    </div>
  );
}

type Props = {
  marker: PlacePanelMarker | null;
  isMobile: boolean;
  onClose: () => void;
};

const panelBaseClass =
  'pointer-events-auto flex flex-col overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[#13131a] shadow-[0_12px_48px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out';

export function PlaceDetailPanel({ marker, isMobile, onClose }: Props) {
  const placeCache = useRef(new Map<string, PlaceDetails>());
  const [detail, setDetail] = useState<DetailState>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    return () => {
      placeCache.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!marker) {
      setDetail(null);
      setEntered(false);
      return;
    }
    setEntered(false);
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, [marker]);

  useEffect(() => {
    if (!marker) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const cache = placeCache.current;
    const cKey = coordCacheKey(marker);

    const cachedByCoord = cache.get(cKey);
    if (cachedByCoord) {
      setDetail(cachedByCoord);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setDetail(null);
      try {
        const nearbyRes = await fetch(
          `/api/places/nearby?lat=${encodeURIComponent(String(marker.lat))}&lng=${encodeURIComponent(String(marker.lng))}&name=${encodeURIComponent(marker.name)}`,
        );
        const nearbyJson = (await nearbyRes.json()) as { results?: { place_id?: string }[]; status?: string };

        const placeId = nearbyJson.results?.[0]?.place_id;
        if (!placeId) {
          const fb: PlaceDetails = { kind: 'fallback' };
          storePlaceDetails(cache, cKey, fb);
          if (!cancelled) setDetail(fb);
          return;
        }

        const cachedByPid = cache.get(placeIdCacheKey(placeId));
        if (cachedByPid) {
          storePlaceDetails(cache, cKey, cachedByPid, placeId);
          if (!cancelled) setDetail(cachedByPid);
          return;
        }

        const detailRes = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
        const detailJson = (await detailRes.json()) as { status?: string; result?: PlaceResult };

        if (cancelled) return;

        if (detailJson.status === 'OK' && detailJson.result) {
          const result: PlaceResult = {
            ...detailJson.result,
            place_id: detailJson.result.place_id ?? placeId,
          };
          const ok: PlaceDetails = { kind: 'ok', result };
          storePlaceDetails(cache, cKey, ok, placeId);
          setDetail(ok);
        } else {
          const fb: PlaceDetails = { kind: 'fallback' };
          storePlaceDetails(cache, cKey, fb);
          setDetail(fb);
        }
      } catch {
        const fb: PlaceDetails = { kind: 'fallback' };
        storePlaceDetails(cache, cKey, fb);
        if (!cancelled) setDetail(fb);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [marker]);

  const photosForCarousel =
    detail?.kind === 'ok' && Array.isArray(detail.result.photos)
      ? detail.result.photos
          .filter((p): p is { photo_reference: string } => Boolean(p?.photo_reference))
          .slice(0, 3)
      : [];

  const carouselResetKey = `${marker?.name ?? ''}-${marker?.lat}-${marker?.lng}-${photosForCarousel.map((p) => p.photo_reference).join('|')}`;

  const displayName = detail?.kind === 'ok' && detail.result.name ? detail.result.name : marker?.name ?? '';
  const rating = detail?.kind === 'ok' ? detail.result.rating : undefined;
  const total = detail?.kind === 'ok' ? detail.result.user_ratings_total : undefined;
  const address = detail?.kind === 'ok' ? detail.result.formatted_address : '';
  const price = detail?.kind === 'ok' ? priceLevelLabel(detail.result.price_level) : '';
  const openNow = detail?.kind === 'ok' ? detail.result.opening_hours?.open_now : undefined;
  const hoursLine = detail?.kind === 'ok' ? todayHoursLine(detail.result.opening_hours?.weekday_text) : null;
  const topReviews =
    detail?.kind === 'ok' && Array.isArray(detail.result.reviews)
      ? [...detail.result.reviews]
          .filter((r) => r.text && String(r.text).trim())
          .slice(0, 2)
      : [];

  const editorialOverview =
    detail?.kind === 'ok' ? (detail.result.editorial_summary?.overview?.trim() ?? '') : '';
  const planActivityDescription = marker?.activityDescription?.trim() ?? '';
  const descriptionBlurb = editorialOverview || planActivityDescription;

  if (!marker) return null;

  const timeLine =
    marker.time?.trim() && marker.duration?.trim()
      ? `${marker.time} · ${marker.duration}`
      : marker.time?.trim() || marker.duration?.trim() || '';

  const mobileMotion = entered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-95';
  const desktopMotion = entered ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0';
  const roundedTop = isMobile ? 'rounded-t-[16px]' : 'rounded-t-[12px]';

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${isMobile ? 'z-[1600] flex items-end justify-stretch' : 'z-[1400] flex items-start justify-start p-3'}`}
      role="presentation"
    >
      <div
        className={`${panelBaseClass} ${isMobile ? `fixed inset-x-0 bottom-0 z-[1600] h-auto max-h-[70vh] w-full rounded-t-[16px] ${mobileMotion}` : `relative z-[1400] w-[320px] max-h-[520px] rounded-[12px] ${desktopMotion}`}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mekan detayı"
      >
        <PhotoCarousel
          photos={photosForCarousel}
          roundedTopClass={roundedTop}
          onClose={onClose}
          resetKey={carouselResetKey}
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#5dcaa5]/90">
            #{marker.sequence}
            {timeLine ? ` · ${timeLine}` : ''}
          </p>
          <h3 className="mt-1 text-[17px] font-bold leading-snug text-white">{displayName}</h3>

          {descriptionBlurb ? (
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[rgba(255,255,255,0.7)]">
              {descriptionBlurb}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-3 text-[13px] text-white/45">Yükleniyor…</p>
          ) : (
            <>
              {rating != null && Number.isFinite(rating) ? (
                <p className="mt-2 text-[13px] text-white/90">
                  <span className="text-[#fbbf24]" aria-hidden>
                    {starsRow(rating)}
                  </span>{' '}
                  {rating.toFixed(1)}
                  {total != null && total > 0 ? (
                    <span className="text-[rgba(255,255,255,0.6)]"> · {total} yorum</span>
                  ) : null}
                </p>
              ) : null}

              {price ? (
                <p className="mt-1 text-[13px] text-[rgba(255,255,255,0.6)]">
                  Fiyat: <span className="text-white/90">{price}</span>
                </p>
              ) : null}

              {address ? (
                <p className="mt-2 text-[12px] leading-relaxed text-[rgba(255,255,255,0.6)]">{address}</p>
              ) : null}

              {detail?.kind === 'ok' && (openNow !== undefined || hoursLine) ? (
                <p className="mt-2 text-[12px] text-[rgba(255,255,255,0.6)]">
                  {openNow === true ? (
                    <span className="text-[#5dcaa5]">Şu an açık</span>
                  ) : openNow === false ? (
                    <span className="text-[#f87171]">Şu an kapalı</span>
                  ) : null}
                  {hoursLine ? (
                    <>
                      {openNow !== undefined ? <span className="text-white/35"> · </span> : null}
                      <span>{hoursLine}</span>
                    </>
                  ) : null}
                </p>
              ) : null}

              {topReviews.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.4)]">
                    Yorumlar
                  </p>
                  <ul className="mt-2 divide-y divide-[rgba(255,255,255,0.1)]">
                    {topReviews.map((rev, i) => (
                      <li key={i} className="py-3 first:pt-2">
                        <p className="text-[11px] text-[rgba(255,255,255,0.4)]">
                          {(rev.author_name ?? 'Anonim').trim()}
                          {rev.rating != null ? (
                            <span className="text-[#fbbf24]"> {reviewStarsRow(rev.rating)}</span>
                          ) : null}
                        </p>
                        <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-[rgba(255,255,255,0.6)]">
                          {rev.text?.trim()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
