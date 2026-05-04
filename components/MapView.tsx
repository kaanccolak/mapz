'use client';

import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlaceDetailPanel } from '@/components/PlaceDetailPanel';
import type { Activity, ActivityType } from '@/types';

type MapMarkerEntry = {
  activityIndex: number;
  lat: number;
  lng: number;
  type: ActivityType;
  title: string;
  sequence: number;
  name: string;
  time: string;
  duration: string;
  description: string;
};

export type MapViewProps = {
  mapQuery: string;
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
  selectedIndex?: number | null;
  onMarkerClick?: (index: number) => void;
  /** InfoWindow kapanınca seçimi sıfırlamak için */
  onSelectionClear?: () => void;
  className?: string;
  /** Varsayılan yakınlaştırma (ör. mobil 12, masaüstü 13) */
  defaultZoom?: number;
  /** true iken harita yüksekliği alt tab bar için kısaltılır */
  isMobile?: boolean;
  /** Verilirse aktivite listesinden önce bu noktaya pan/zoom uygulanır */
  centerLat?: number;
  centerLng?: number;
  /** Mobil detay paneli açık/kapalı (üst layout’ta scrim için) */
  onDetailPanelOpenChange?: (open: boolean) => void;
  /** Mobil planda aktivite satırına her tıklamada artar; harita yalnızca konuma gider (panel açılmaz) */
  mobileListFocusNonce?: number;
};

/** Koordinat + isim ile nearby foto önbelleği (photo_reference veya null) */
const pinPhotoCache = new Map<string, string | null>();

function pinPhotoCacheKey(lat: number, lng: number, name: string): string {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}::${name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
}

function getCategoryDisplay(type: ActivityType, name: string): { emoji: string; bg: string } {
  const n = name.toLocaleLowerCase('tr-TR');
  if (
    /transfer|shuttle|havaalanı|havalimani|airport|taksi|taxi|otobüs|otobus|ulaşım|ulasim|metro|gidiş otobüs|dönüş otobüs/.test(
      n,
    )
  ) {
    return { emoji: '🚗', bg: '#475569' };
  }
  if (/otel|hotel|pansiyon|konaklama|hostel|resort|apart|bnb|airbnb/.test(n)) {
    return { emoji: '🏨', bg: '#0d9488' };
  }
  if (/plaj|beach|sahil|kumsal/.test(n)) return { emoji: '🏖️', bg: '#eab308' };
  if (/bar|pub|gece|kulüp|club|bistro/.test(n)) return { emoji: '🍸', bg: '#1e3a5f' };
  if (/alışveriş|alisveris|avm|mağaza|magaza|çarşı|carsi|outlet/.test(n)) return { emoji: '🛍️', bg: '#7c3aed' };
  if (/park|doğa|doga|orman|milli park|yürüyüş|yuruyus|şelale|selale/.test(n)) return { emoji: '🌿', bg: '#16a34a' };
  if (/müze|muze|galeri|kale|anıt|anit/.test(n)) return { emoji: '🏛️', bg: '#2563eb' };

  switch (type) {
    case 'yemek':
      return { emoji: '🍽️', bg: '#dc2626' };
    case 'kafe':
      return { emoji: '☕', bg: '#ea580c' };
    case 'gezi':
      return { emoji: '🏛️', bg: '#2563eb' };
    case 'aktif':
      return { emoji: '🌿', bg: '#15803d' };
    default:
      return { emoji: '📍', bg: '#6b7280' };
  }
}

function truncatePinLabelName(name: string, maxLen = 18): string {
  const t = name.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}...`;
}

type PhotoLoadState = string | null | undefined;

function useMarkerPinPhotos(entries: MapMarkerEntry[]) {
  const [photoByActivity, setPhotoByActivity] = useState<Record<number, PhotoLoadState>>({});
  const entriesKey = useMemo(
    () =>
      entries
        .map((e) => `${e.activityIndex}:${e.lat.toFixed(4)}:${e.lng.toFixed(4)}:${e.name}`)
        .join('|'),
    [entries],
  );

  useEffect(() => {
    const ac = new AbortController();
    let alive = true;

    setPhotoByActivity({});

    const run = async () => {
      const BATCH = 3;
      for (let i = 0; i < entries.length; i += BATCH) {
        if (!alive || ac.signal.aborted) break;
        const batch = entries.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (entry) => {
            const cacheKey = pinPhotoCacheKey(entry.lat, entry.lng, entry.name);
            if (pinPhotoCache.has(cacheKey)) {
              const cached = pinPhotoCache.get(cacheKey)!;
              if (alive && !ac.signal.aborted) {
                setPhotoByActivity((prev) => ({ ...prev, [entry.activityIndex]: cached }));
              }
              return;
            }
            try {
              const res = await fetch(
                `/api/places/nearby?lat=${encodeURIComponent(String(entry.lat))}&lng=${encodeURIComponent(String(entry.lng))}&name=${encodeURIComponent(entry.name)}`,
                { signal: ac.signal },
              );
              const j = (await res.json()) as {
                results?: { photos?: { photo_reference?: string }[] }[];
              };
              const ref = j.results?.[0]?.photos?.[0]?.photo_reference ?? null;
              pinPhotoCache.set(cacheKey, ref);
              if (alive && !ac.signal.aborted) {
                setPhotoByActivity((prev) => ({ ...prev, [entry.activityIndex]: ref }));
              }
            } catch {
              if (ac.signal.aborted) return;
              pinPhotoCache.set(cacheKey, null);
              if (alive) {
                setPhotoByActivity((prev) => ({ ...prev, [entry.activityIndex]: null }));
              }
            }
          }),
        );
      }
    };

    void run();
    return () => {
      alive = false;
      ac.abort();
    };
  }, [entriesKey]);

  return photoByActivity;
}

type MindtripPinProps = {
  entry: MapMarkerEntry;
  photoRef: PhotoLoadState;
  isSelected: boolean;
};

function MindtripPinGlyph({ entry, photoRef, isSelected }: MindtripPinProps) {
  const size = isSelected ? 52 : 40;
  const borderW = isSelected ? 3 : 2;
  const borderColor = isSelected ? '#1d9e75' : '#ffffff';
  const shadow = isSelected ? '0 4px 18px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.3)';
  const { emoji, bg } = getCategoryDisplay(entry.type, entry.name);
  const hasPhoto = typeof photoRef === 'string' && photoRef.length > 0;
  const labelTitle = truncatePinLabelName(entry.name);

  /** Harita anchor = yuvarlak pin merkezi; etiket sağa uzanır (genişlik offset’e dahil değil). */
  const anchorHalf = size / 2 + borderW;

  return (
    <div className="relative z-[1100] h-0 w-0 overflow-visible">
      <div
        className="absolute left-0 top-0 flex cursor-pointer items-center gap-1"
        style={{
          transform: `translate(-${anchorHalf}px, -${anchorHalf}px)`,
        }}
      >
        <div
          className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{
            width: size,
            height: size,
            border: `${borderW}px solid ${borderColor}`,
            boxShadow: shadow,
          }}
        >
          {hasPhoto ? (
            <img
              src={`/api/places/photo?ref=${encodeURIComponent(photoRef)}&maxwidth=80`}
              alt=""
              className="h-full w-full object-cover [image-rendering:crisp-edges]"
              width={size}
              height={size}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center leading-none"
              style={{ background: bg, fontSize: Math.round(size * 0.42) }}
              aria-hidden
            >
              {emoji}
            </span>
          )}
        </div>
        <div
          className={`flex max-w-[200px] shrink-0 items-center gap-1 rounded-[20px] py-[3px] pl-1 pr-2 backdrop-blur-[4px] ${
            isSelected ? 'border border-[#1d9e75]' : 'border border-[rgba(255,255,255,0.15)]'
          }`}
          style={{ background: 'rgba(15,15,20,0.85)' }}
        >
          <span className="shrink-0 text-[12px] leading-none" aria-hidden>
            {emoji}
          </span>
          <span className="min-w-0 text-[11px] font-semibold leading-tight text-white">{labelTitle}</span>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

function activityRowId(dayNumber: number, index: number) {
  return `${dayNumber}-${index}`;
}

function buildMarkerEntries(
  activities: Activity[],
  dayNumber: number,
  removedIds: Set<string>
): MapMarkerEntry[] {
  const out: MapMarkerEntry[] = [];
  activities.forEach((a, i) => {
    if (removedIds.has(activityRowId(dayNumber, i))) return;
    const lat = a.lat;
    const lng = a.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    out.push({
      activityIndex: i,
      lat,
      lng,
      type: a.type,
      title: a.time && String(a.time).trim() ? `${a.time} — ${a.name}` : a.name,
      sequence: i + 1,
      name: a.name,
      time: a.time,
      duration: a.duration,
      description: typeof a.description === 'string' ? a.description : '',
    });
  });
  return out;
}

function hasFocusableCoords(
  selectedIndex: number | null | undefined,
  activities: Activity[],
  dayNumber: number,
  removedIds: Set<string>
): boolean {
  if (selectedIndex === null || selectedIndex === undefined) return false;
  const activity = activities[selectedIndex];
  if (!activity) return false;
  if (removedIds.has(activityRowId(dayNumber, selectedIndex))) return false;
  const lat = activity.lat;
  const lng = activity.lng;
  return typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
}

/** İsteğe bağlı sabit merkez (aktivite listesinden bağımsız) */
function MapCenterFromProps({
  centerLat,
  centerLng,
  defaultZoom,
  selectedIndex,
  activities,
  dayNumber,
  removedIds,
}: {
  centerLat?: number;
  centerLng?: number;
  defaultZoom: number;
  selectedIndex?: number | null;
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || centerLat == null || centerLng == null) return;
    if (Number.isNaN(centerLat) || Number.isNaN(centerLng)) return;
    if (hasFocusableCoords(selectedIndex, activities, dayNumber, removedIds)) return;
    map.panTo({ lat: centerLat, lng: centerLng });
    map.setZoom(defaultZoom);
  }, [map, centerLat, centerLng, defaultZoom, selectedIndex, activities, dayNumber, removedIds]);
  return null;
}

/** Aktiviteler / gün değişince ilk geçerli koordinata pan (yeniden mount yok) */
function MapPanToFirstActivity({
  activities,
  dayNumber,
  removedIds,
  selectedIndex,
  defaultZoom,
  centerLat,
  centerLng,
}: {
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
  selectedIndex?: number | null;
  defaultZoom: number;
  centerLat?: number;
  centerLng?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !activities?.length) return;
    if (hasFocusableCoords(selectedIndex, activities, dayNumber, removedIds)) return;
    const hasCenterProp =
      typeof centerLat === 'number' &&
      typeof centerLng === 'number' &&
      !Number.isNaN(centerLat) &&
      !Number.isNaN(centerLng);
    if (hasCenterProp) return;

    const firstValid = activities.find((a, i) => {
      if (removedIds.has(activityRowId(dayNumber, i))) return false;
      const la = a.lat;
      const lo = a.lng;
      return typeof la === 'number' && typeof lo === 'number' && !Number.isNaN(la) && !Number.isNaN(lo);
    });
    if (!firstValid || firstValid.lat == null || firstValid.lng == null) return;
    map.panTo({ lat: firstValid.lat, lng: firstValid.lng });
    map.setZoom(defaultZoom);
  }, [map, activities, dayNumber, removedIds, selectedIndex, defaultZoom, centerLat, centerLng]);
  return null;
}

function GeocodeFallback({ mapQuery, defaultZoom }: { mapQuery: string; defaultZoom: number }) {
  const map = useMap();
  const geocoding = useMapsLibrary('geocoding');

  useEffect(() => {
    if (!map || !geocoding || !mapQuery.trim()) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: mapQuery }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(defaultZoom);
      } else {
        map.setCenter({ lat: 41.0082, lng: 28.9784 });
        map.setZoom(5);
      }
    });
  }, [map, geocoding, mapQuery, defaultZoom]);

  return null;
}

type SelectionFollowProps = {
  selectedIndex: number | null | undefined;
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
  onPopupReady: (index: number | null) => void;
  isMobile: boolean;
  mobileListFocusNonce: number;
};

/** selectedIndex değişince haritayı odağa taşır; masaüstünde kısa gecikmeyle detay paneli açar */
function SelectionFollow({
  selectedIndex,
  activities,
  dayNumber,
  removedIds,
  onPopupReady,
  isMobile,
  mobileListFocusNonce,
}: SelectionFollowProps) {
  const map = useMap();
  const lastProcessedListNonceRef = useRef(0);

  useEffect(() => {
    lastProcessedListNonceRef.current = 0;
  }, [dayNumber]);

  useEffect(() => {
    if (selectedIndex === null || selectedIndex === undefined) {
      onPopupReady(null);
      return;
    }

    const activity = activities[selectedIndex];
    if (!activity) {
      onPopupReady(null);
      if (isMobile && mobileListFocusNonce > lastProcessedListNonceRef.current) {
        lastProcessedListNonceRef.current = mobileListFocusNonce;
      }
      return;
    }

    const rowId = activityRowId(dayNumber, selectedIndex);
    if (removedIds.has(rowId)) {
      onPopupReady(null);
      if (isMobile && mobileListFocusNonce > lastProcessedListNonceRef.current) {
        lastProcessedListNonceRef.current = mobileListFocusNonce;
      }
      return;
    }

    const lat = activity.lat;
    const lng = activity.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      onPopupReady(null);
      if (isMobile && mobileListFocusNonce > lastProcessedListNonceRef.current) {
        lastProcessedListNonceRef.current = mobileListFocusNonce;
      }
      return;
    }

    if (!map) return;

    if (!isMobile) {
      onPopupReady(null);
      map.panTo({ lat, lng });
      map.setZoom(15);
      const t = window.setTimeout(() => {
        onPopupReady(selectedIndex);
      }, 400);
      return () => {
        window.clearTimeout(t);
      };
    }

    if (mobileListFocusNonce > lastProcessedListNonceRef.current) {
      lastProcessedListNonceRef.current = mobileListFocusNonce;
      onPopupReady(null);
      const t = window.setTimeout(() => {
        map.panTo({ lat, lng });
        map.setZoom(16);
      }, 150);
      return () => {
        window.clearTimeout(t);
      };
    }

    map.panTo({ lat, lng });
    map.setZoom(16);
  }, [
    map,
    selectedIndex,
    activities,
    dayNumber,
    removedIds,
    onPopupReady,
    isMobile,
    mobileListFocusNonce,
  ]);

  return null;
}

type MarkerPinProps = {
  entry: MapMarkerEntry;
  photoRef: PhotoLoadState;
  isSelected: boolean;
  onOpen: () => void;
};

function MarkerPin({ entry, photoRef, isSelected, onOpen }: MarkerPinProps) {
  const position = { lat: entry.lat, lng: entry.lng };

  return (
    <AdvancedMarker position={position} title={entry.title} onClick={onOpen}>
      <MindtripPinGlyph entry={entry} photoRef={photoRef} isSelected={isSelected} />
    </AdvancedMarker>
  );
}

type MapInnerProps = {
  mapQuery: string;
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
  selectedIndex?: number | null;
  onMarkerClick?: (index: number) => void;
  onSelectionClear?: () => void;
  defaultZoom: number;
  isMobile: boolean;
  centerLat?: number;
  centerLng?: number;
  onDetailPanelOpenChange?: (open: boolean) => void;
  mobileListFocusNonce: number;
};

function MapInner({
  mapQuery,
  activities,
  dayNumber,
  removedIds,
  selectedIndex,
  onMarkerClick,
  onSelectionClear,
  defaultZoom,
  isMobile,
  centerLat,
  centerLng,
  onDetailPanelOpenChange,
  mobileListFocusNonce,
}: MapInnerProps) {
  const [panelIndex, setPanelIndex] = useState<number | null>(null);

  useEffect(() => {
    setPanelIndex(null);
  }, [dayNumber]);

  useEffect(() => {
    if (selectedIndex === null || selectedIndex === undefined) {
      setPanelIndex(null);
    }
  }, [selectedIndex]);

  useEffect(() => {
    onDetailPanelOpenChange?.(panelIndex != null);
  }, [panelIndex, onDetailPanelOpenChange]);

  const markerEntries = useMemo(
    () => buildMarkerEntries(activities, dayNumber, removedIds),
    [activities, dayNumber, removedIds]
  );

  const pinPhotos = useMarkerPinPhotos(markerEntries);

  const path = useMemo(
    () => markerEntries.map((m) => ({ lat: m.lat, lng: m.lng })),
    [markerEntries]
  );

  const onPopupReady = useCallback((index: number | null) => {
    setPanelIndex(index);
  }, []);

  const panelMarker = useMemo(() => {
    if (panelIndex == null) return null;
    const e = markerEntries.find((m) => m.activityIndex === panelIndex);
    if (!e) return null;
    return {
      name: e.name,
      lat: e.lat,
      lng: e.lng,
      time: e.time,
      duration: e.duration,
      sequence: e.sequence,
      activityDescription: e.description,
    };
  }, [panelIndex, markerEntries]);

  const defaultCenter = path[0] ?? { lat: 41.0082, lng: 28.9784 };
  const initialZoom = path.length === 0 ? 5 : defaultZoom;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || DEFAULT_MAP_ID;

  const handleMarkerOpen = useCallback(
    (activityIndex: number) => {
      setPanelIndex(activityIndex);
      onMarkerClick?.(activityIndex);
    },
    [onMarkerClick]
  );

  const handlePanelClose = useCallback(() => {
    setPanelIndex(null);
    onSelectionClear?.();
  }, [onSelectionClear]);

  return (
    <div className="relative h-full min-h-0 w-full">
      <GoogleMap
        mapId={mapId}
        defaultCenter={defaultCenter}
        defaultZoom={initialZoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{
          width: '100%',
          height: '100%',
          minHeight: isMobile ? 0 : 320,
        }}
      >
        <SelectionFollow
          selectedIndex={selectedIndex}
          activities={activities}
          dayNumber={dayNumber}
          removedIds={removedIds}
          onPopupReady={onPopupReady}
          isMobile={isMobile}
          mobileListFocusNonce={mobileListFocusNonce}
        />
        {markerEntries.map((entry) => (
          <MarkerPin
            key={`${entry.activityIndex}-${entry.lat}-${entry.lng}`}
            entry={entry}
            photoRef={pinPhotos[entry.activityIndex]}
            isSelected={
              panelIndex === entry.activityIndex ||
              (selectedIndex !== null &&
                selectedIndex !== undefined &&
                selectedIndex === entry.activityIndex)
            }
            onOpen={() => handleMarkerOpen(entry.activityIndex)}
          />
        ))}
        {path.length > 0 ? (
          <>
            <MapCenterFromProps
              centerLat={centerLat}
              centerLng={centerLng}
              defaultZoom={defaultZoom}
              selectedIndex={selectedIndex}
              activities={activities}
              dayNumber={dayNumber}
              removedIds={removedIds}
            />
            <MapPanToFirstActivity
              activities={activities}
              dayNumber={dayNumber}
              removedIds={removedIds}
              selectedIndex={selectedIndex}
              defaultZoom={defaultZoom}
              centerLat={centerLat}
              centerLng={centerLng}
            />
          </>
        ) : (
          <GeocodeFallback mapQuery={mapQuery} defaultZoom={defaultZoom} />
        )}
      </GoogleMap>

      {panelMarker ? (
        <PlaceDetailPanel marker={panelMarker} isMobile={isMobile} onClose={handlePanelClose} />
      ) : null}
    </div>
  );
}

export function MapView({
  mapQuery,
  activities,
  dayNumber,
  removedIds,
  selectedIndex,
  onMarkerClick,
  onSelectionClear,
  className = '',
  defaultZoom = 13,
  isMobile = false,
  centerLat,
  centerLng,
  onDetailPanelOpenChange,
  mobileListFocusNonce = 0,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  if (!apiKey) {
    return (
      <div
        className={`flex h-full min-h-[320px] items-center justify-center bg-[#f8f8f7] text-center text-sm text-[#6b7280] ${className}`}
      >
        Harita için{' '}
        <code className="mx-1 rounded bg-[#e5e7eb] px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> ekleyin.
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full min-h-0 overflow-hidden ${className}`}
      style={{ height: isMobile ? 'calc(100vh - 60px)' : '100%' }}
    >
      <APIProvider apiKey={apiKey} libraries={['geocoding', 'marker']}>
        <MapInner
          mapQuery={mapQuery}
          activities={activities}
          dayNumber={dayNumber}
          removedIds={removedIds}
          selectedIndex={selectedIndex}
          onMarkerClick={onMarkerClick}
          onSelectionClear={onSelectionClear}
          defaultZoom={defaultZoom}
          isMobile={isMobile}
          centerLat={centerLat}
          centerLng={centerLng}
          onDetailPanelOpenChange={onDetailPanelOpenChange}
          mobileListFocusNonce={mobileListFocusNonce}
        />
      </APIProvider>
    </div>
  );
}
