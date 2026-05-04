'use client';

import { AdvancedMarker, APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
};

const PIN_COLORS: Record<string, { background: string; borderColor: string; glyphColor: string }> = {
  gezi: { background: '#185FA5', borderColor: '#0C447C', glyphColor: '#ffffff' },
  yemek: { background: '#D85A30', borderColor: '#993C1D', glyphColor: '#ffffff' },
  kafe: { background: '#1D9E75', borderColor: '#0F6E56', glyphColor: '#ffffff' },
  aktif: { background: '#7F77DD', borderColor: '#534AB7', glyphColor: '#ffffff' },
  default: { background: '#888780', borderColor: '#5F5E5A', glyphColor: '#ffffff' },
};

const getPinConfig = (type: string) => {
  return PIN_COLORS[type] ?? PIN_COLORS['default'];
};

function NumberedPinGlyph({ number, type }: { number: number; type: string }) {
  const { background } = getPinConfig(type);
  return (
    <div
      className="relative z-[1000] flex items-center justify-center rounded-full border-[3px] border-white text-[13px] font-bold text-white"
      style={{
        background,
        width: 36,
        height: 36,
        boxShadow: `0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px ${background}`,
      }}
    >
      {number}
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
};

/** selectedIndex değişince haritayı animasyonla odağa taşır; popup gecikmesi pan animasyonu için */
function SelectionFollow({
  selectedIndex,
  activities,
  dayNumber,
  removedIds,
  onPopupReady,
}: SelectionFollowProps) {
  const map = useMap();

  useEffect(() => {
    if (selectedIndex === null || selectedIndex === undefined) {
      onPopupReady(null);
      return;
    }

    const activity = activities[selectedIndex];
    if (!activity) {
      onPopupReady(null);
      return;
    }

    const rowId = activityRowId(dayNumber, selectedIndex);
    if (removedIds.has(rowId)) {
      onPopupReady(null);
      return;
    }

    const lat = activity.lat;
    const lng = activity.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      onPopupReady(null);
      return;
    }

    if (!map) return;

    onPopupReady(null);
    map.panTo({ lat, lng });
    map.setZoom(15);

    const t = window.setTimeout(() => {
      onPopupReady(selectedIndex);
    }, 400);

    return () => {
      window.clearTimeout(t);
    };
  }, [map, selectedIndex, activities, dayNumber, removedIds, onPopupReady]);

  return null;
}

type MarkerPinProps = {
  entry: MapMarkerEntry;
  onOpen: () => void;
};

function MarkerPin({ entry, onOpen }: MarkerPinProps) {
  const position = { lat: entry.lat, lng: entry.lng };
  const seq = entry.sequence;

  return (
    <AdvancedMarker position={position} title={entry.title} onClick={onOpen}>
      <div className="-translate-x-1/2 -translate-y-1/2">
        <NumberedPinGlyph number={seq} type={entry.type} />
      </div>
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
}: MapInnerProps) {
  const [panelIndex, setPanelIndex] = useState<number | null>(null);

  useEffect(() => {
    setPanelIndex(null);
  }, [dayNumber]);

  const markerEntries = useMemo(
    () => buildMarkerEntries(activities, dayNumber, removedIds),
    [activities, dayNumber, removedIds]
  );

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
      <Map
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
        />
        {markerEntries.map((entry) => (
          <MarkerPin
            key={`${entry.activityIndex}-${entry.lat}-${entry.lng}`}
            entry={entry}
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
      </Map>

      {panelMarker ? (
        <>
          {isMobile ? (
            <button
              type="button"
              className="absolute inset-0 z-[1300] bg-black/45 backdrop-blur-[1px] transition-opacity"
              onClick={handlePanelClose}
              aria-label="Paneli kapat"
            />
          ) : null}
          <PlaceDetailPanel marker={panelMarker} isMobile={isMobile} onClose={handlePanelClose} />
        </>
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
        />
      </APIProvider>
    </div>
  );
}
