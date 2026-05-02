'use client';

import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

function FitBounds({
  path,
  selectedIndex,
  activities,
  dayNumber,
  removedIds,
}: {
  path: google.maps.LatLngLiteral[];
  selectedIndex?: number | null;
  activities: Activity[];
  dayNumber: number;
  removedIds: Set<string>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length === 0) return;
    if (hasFocusableCoords(selectedIndex, activities, dayNumber, removedIds)) return;
    if (path.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    } else {
      map.setCenter(path[0]);
      map.setZoom(14);
    }
  }, [map, path, selectedIndex, activities, dayNumber, removedIds]);
  return null;
}

function GeocodeFallback({ mapQuery }: { mapQuery: string }) {
  const map = useMap();
  const geocoding = useMapsLibrary('geocoding');

  useEffect(() => {
    if (!map || !geocoding || !mapQuery.trim()) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: mapQuery }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(13);
      } else {
        map.setCenter({ lat: 41.0082, lng: 28.9784 });
        map.setZoom(5);
      }
    });
  }, [map, geocoding, mapQuery]);

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
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

function MarkerPin({ entry, isOpen, onOpen, onClose }: MarkerPinProps) {
  const [markerRef, markerEl] = useAdvancedMarkerRef();
  const position = { lat: entry.lat, lng: entry.lng };
  const seq = entry.sequence;
  const headline = entry.name;
  const hasTime = entry.time != null && String(entry.time).trim() !== '';
  const timeLine = hasTime
    ? entry.duration != null && String(entry.duration).trim() !== ''
      ? `${entry.time} · ${entry.duration}`
      : String(entry.time)
    : entry.duration != null && String(entry.duration).trim() !== ''
      ? String(entry.duration)
      : '';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={entry.title}
        onClick={onOpen}
      >
        <div className="-translate-x-1/2 -translate-y-1/2">
          <NumberedPinGlyph number={seq} type={entry.type} />
        </div>
      </AdvancedMarker>
      {isOpen && markerEl ? (
        <InfoWindow anchor={markerEl} onCloseClick={onClose}>
          <div className="max-w-[240px] text-[13px] text-[#0a0a0f]">
            <strong>
              {seq}. {headline}
            </strong>
            {timeLine ? (
              <>
                <br />
                {timeLine}
              </>
            ) : null}
          </div>
        </InfoWindow>
      ) : null}
    </>
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
};

function MapInner({
  mapQuery,
  activities,
  dayNumber,
  removedIds,
  selectedIndex,
  onMarkerClick,
  onSelectionClear,
}: MapInnerProps) {
  const [popupIndex, setPopupIndex] = useState<number | null>(null);

  const markerEntries = useMemo(
    () => buildMarkerEntries(activities, dayNumber, removedIds),
    [activities, dayNumber, removedIds]
  );

  const path = useMemo(
    () => markerEntries.map((m) => ({ lat: m.lat, lng: m.lng })),
    [markerEntries]
  );

  const onPopupReady = useCallback((index: number | null) => {
    setPopupIndex(index);
  }, []);

  const defaultCenter = path[0] ?? { lat: 41.0082, lng: 28.9784 };
  const defaultZoom = path.length === 0 ? 5 : 13;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || DEFAULT_MAP_ID;

  const handleMarkerOpen = useCallback(
    (activityIndex: number) => {
      onMarkerClick?.(activityIndex);
    },
    [onMarkerClick]
  );

  const handleInfoClose = useCallback(() => {
    setPopupIndex(null);
    onSelectionClear?.();
  }, [onSelectionClear]);

  return (
    <Map
      mapId={mapId}
      defaultCenter={defaultCenter}
      defaultZoom={defaultZoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%', minHeight: '320px' }}
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
          isOpen={popupIndex === entry.activityIndex}
          onOpen={() => handleMarkerOpen(entry.activityIndex)}
          onClose={handleInfoClose}
        />
      ))}
      {path.length > 0 ? (
        <FitBounds
          path={path}
          selectedIndex={selectedIndex}
          activities={activities}
          dayNumber={dayNumber}
          removedIds={removedIds}
        />
      ) : (
        <GeocodeFallback mapQuery={mapQuery} />
      )}
    </Map>
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
    <div className={`h-full min-h-[320px] w-full overflow-hidden ${className}`}>
      <APIProvider apiKey={apiKey} libraries={['geocoding', 'marker']}>
        <MapInner
          mapQuery={mapQuery}
          activities={activities}
          dayNumber={dayNumber}
          removedIds={removedIds}
          selectedIndex={selectedIndex}
          onMarkerClick={onMarkerClick}
          onSelectionClear={onSelectionClear}
        />
      </APIProvider>
    </div>
  );
}
