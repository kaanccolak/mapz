/**
 * Google Maps (web) URL dizesinden place_id, koordinat veya yer adı slug'ı çıkarır.
 */

export type PlaceHints = {
  placeId?: string;
  lat?: number;
  lng?: number;
  /** /maps/place/{slug}/ — Text Search için */
  placeSlug?: string;
};

function num(x: string): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Pattern: ChIJ place_id (Places Details ile kullanılır).
 * Hex CID (!1s0x...:0x...) çıkarılmaz — slug + koordinat ile Text Search kullanılır.
 * Pattern: /@lat,lng/, ?q=, !3d!4d, /maps/place/slug
 */
export function extractPlaceHintsFromMapsUrl(url: string): PlaceHints {
  let s = url.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }

  const out: PlaceHints = {};

  const p1 = /\/maps\/place\/[\s\S]*?!1s(ChIJ[a-zA-Z0-9_-]+)/.exec(s);
  if (p1?.[1]) out.placeId = p1[1];
  if (!out.placeId) {
    const p1b = /!1s(ChIJ[a-zA-Z0-9_-]{20,})/.exec(s);
    if (p1b?.[1]) out.placeId = p1b[1];
  }

  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s);
  if (at) {
    const la = num(at[1]);
    const lo = num(at[2]);
    if (la != null && lo != null) {
      out.lat = la;
      out.lng = lo;
    }
  }

  const q = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s);
  if (out.lat == null && out.lng == null && q) {
    const la = num(q[1]);
    const lo = num(q[2]);
    if (la != null && lo != null) {
      out.lat = la;
      out.lng = lo;
    }
  }

  const d3d4 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(s);
  if (out.lat == null && out.lng == null && d3d4) {
    const la = num(d3d4[1]);
    const lo = num(d3d4[2]);
    if (la != null && lo != null) {
      out.lat = la;
      out.lng = lo;
    }
  }

  const slugM = /\/maps\/place\/([^/@?]+)/.exec(url);
  if (slugM?.[1]) {
    const raw = slugM[1];
    const slug = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
    if (
      slug &&
      slug.toLowerCase() !== 'data' &&
      !/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(slug) &&
      !/^[@!].+$/.test(slug)
    ) {
      out.placeSlug = slug;
    }
  }

  return out;
}

/** Metre cinsinden iki nokta arası (yakınlık sıralaması) */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
