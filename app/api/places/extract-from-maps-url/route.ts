import { NextRequest, NextResponse } from 'next/server';
import {
  extractPlaceHintsFromMapsUrl,
  haversineMeters,
} from '@/lib/extractPlaceHintsFromMapsUrl';
import { parseGoogleMapsUrl, unwrapGoogleRedirectUrl } from '@/lib/parseGoogleMapsUrl';

function mapsKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
}

const DETAIL_FIELDS = 'name,geometry,types';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const fetchOpts = {
  redirect: 'follow' as RequestRedirect,
  headers: {
    'User-Agent': BROWSER_UA,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  },
};

/** Places Details yalnızca ChIJ… place_id ile güvenilir; hex CID (0x…:0x…) yok sayılır. */
function usablePlacesPlaceId(id: string | undefined): string | undefined {
  if (!id?.trim()) return undefined;
  const t = id.trim();
  if (t.startsWith('ChIJ') && t.length >= 24) return t;
  return undefined;
}

function isShortMapsHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'maps.app.goo.gl' || h === 'goo.gl' || h.endsWith('.goo.gl');
}

/**
 * Kısa linklerde önce HEAD (gövde = generic HTML riski yok); yetersizse GET ile response.url.
 */
async function resolveFinalUrl(originalUrl: string): Promise<string | null> {
  let hostname: string;
  try {
    hostname = new URL(originalUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(new URL(originalUrl).protocol)) return null;

  if (isShortMapsHost(hostname)) {
    try {
      const head = await fetch(originalUrl, { method: 'HEAD', ...fetchOpts });
      const u = unwrapGoogleRedirectUrl(head.url);
      const merged = mergeHintsWithLegacy(u);
      if (merged.placeId || (merged.lat != null && merged.lng != null) || merged.placeSlug) {
        return u;
      }
    } catch {
      /* HEAD yok / hata → GET */
    }

    const get = await fetch(originalUrl, { method: 'GET', ...fetchOpts });
    if (!get.ok) return null;
    return unwrapGoogleRedirectUrl(get.url);
  }

  const get = await fetch(originalUrl, { method: 'GET', ...fetchOpts });
  if (!get.ok) return null;
  return unwrapGoogleRedirectUrl(get.url);
}

function mergeHintsWithLegacy(url: string): ReturnType<typeof extractPlaceHintsFromMapsUrl> {
  const hints = extractPlaceHintsFromMapsUrl(url);
  const legacy = parseGoogleMapsUrl(url);
  return {
    placeId: usablePlacesPlaceId(hints.placeId) ?? usablePlacesPlaceId(legacy.placeId),
    lat: hints.lat ?? legacy.lat,
    lng: hints.lng ?? legacy.lng,
    placeSlug: hints.placeSlug,
  };
}

type DetailsResult = {
  status?: string;
  result?: {
    name?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    types?: string[];
  };
};

type NearbyPlace = {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location?: { lat?: number; lng?: number } };
  types?: string[];
};

type NearbyResponse = {
  status?: string;
  results?: NearbyPlace[];
};

type TextSearchResponse = {
  status?: string;
  results?: {
    place_id?: string;
    name?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    types?: string[];
  }[];
};

async function fetchPlaceDetails(
  key: string,
  placeId: string,
): Promise<{ name: string; lat: number; lng: number; types: string[] } | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: DETAIL_FIELDS,
    language: 'tr',
    key,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`, {
    next: { revalidate: 0 },
  });
  const data = (await res.json()) as DetailsResult;
  if (data.status !== 'OK' || !data.result?.name?.trim()) return null;
  const loc = data.result.geometry?.location;
  const dLat = typeof loc?.lat === 'number' ? loc.lat : undefined;
  const dLng = typeof loc?.lng === 'number' ? loc.lng : undefined;
  if (dLat == null || dLng == null) return null;
  return {
    name: data.result.name.trim(),
    lat: dLat,
    lng: dLng,
    types: data.result.types ?? [],
  };
}

/** radius 30 m içinde kalanları merkeze göre sırala; en yakın. */
function pickClosestWithinRadius(
  results: NearbyPlace[],
  centerLat: number,
  centerLng: number,
  maxMeters: number,
): NearbyPlace | null {
  const center = { lat: centerLat, lng: centerLng };
  const valid = results
    .filter((r) => r.name?.trim() && r.geometry?.location)
    .map((r) => {
      const loc = r.geometry!.location!;
      const lat = loc.lat!;
      const lng = loc.lng!;
      const d = haversineMeters(center, { lat, lng });
      return { r, d };
    })
    .filter(({ d }) => d <= maxMeters)
    .sort((a, b) => a.d - b.d);

  return valid[0]?.r ?? null;
}

export async function POST(req: NextRequest) {
  const key = mapsKey();
  if (!key) {
    return NextResponse.json({ ok: false, error: 'Maps API anahtarı yok' }, { status: 500 });
  }

  let body: { url?: string; destination?: string };
  try {
    body = (await req.json()) as { url?: string; destination?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek' }, { status: 400 });
  }

  const rawUrl = (body.url ?? '').trim();
  const destination = (body.destination ?? '').trim();

  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: 'URL gerekli' }, { status: 400 });
  }

  const finalUrl = await resolveFinalUrl(rawUrl);
  if (!finalUrl) {
    return NextResponse.json({ ok: false, error: 'Mekan bulunamadı' }, { status: 404 });
  }

  const merged = mergeHintsWithLegacy(finalUrl);
  const placeId = merged.placeId;
  const lat = merged.lat;
  const lng = merged.lng;
  const placeSlug = merged.placeSlug;

  console.log('Original URL:', rawUrl);
  console.log('Final URL after redirect:', finalUrl);
  console.log('Extracted place_id (ChIJ only):', placeId ?? '—');
  console.log('Extracted coords:', lat ?? '—', lng ?? '—');
  console.log('Extracted place slug:', placeSlug ?? '—');

  try {
    if (placeId) {
      const details = await fetchPlaceDetails(key, placeId);
      if (details) {
        return NextResponse.json({ ok: true, ...details });
      }
    }

    /** Slug + koordinat: Text Search (konum + 200 m) → ilk sonuç place_id → Details. Hex CID kullanılmaz. */
    if (placeSlug && lat != null && lng != null) {
      const slugQuery = placeSlug.replace(/\+/g, ' ').trim();
      if (slugQuery) {
        const tsParams = new URLSearchParams({
          query: slugQuery,
          location: `${lat},${lng}`,
          radius: '200',
          language: 'tr',
          key,
        });
        const tsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?${tsParams}`,
          { next: { revalidate: 0 } },
        );
        const ts = (await tsRes.json()) as TextSearchResponse;
        const first = ts.results?.[0];
        const resolvedId = usablePlacesPlaceId(first?.place_id);
        if (ts.status === 'OK' && resolvedId) {
          const details = await fetchPlaceDetails(key, resolvedId);
          if (details) {
            return NextResponse.json({ ok: true, ...details });
          }
        }
      }
    }

    if (lat != null && lng != null) {
      const nearbyParams = new URLSearchParams({
        location: `${lat},${lng}`,
        radius: '30',
        key,
        language: 'tr',
      });
      const nearbyRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nearbyParams}`,
        { next: { revalidate: 0 } },
      );
      const nearby = (await nearbyRes.json()) as NearbyResponse;
      const closest = pickClosestWithinRadius(nearby.results ?? [], lat, lng, 30);
      if (closest?.name?.trim() && closest.geometry?.location) {
        const la = closest.geometry.location.lat;
        const lo = closest.geometry.location.lng;
        if (typeof la === 'number' && typeof lo === 'number') {
          return NextResponse.json({
            ok: true,
            name: closest.name.trim(),
            lat: la,
            lng: lo,
            types: closest.types ?? [],
          });
        }
      }
    }

    if (placeSlug) {
      const q = [placeSlug.replace(/\+/g, ' '), destination].filter(Boolean).join(' ').trim();
      if (q) {
        const tsParams = new URLSearchParams({
          query: q,
          language: 'tr',
          key,
        });
        const tsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?${tsParams}`,
          { next: { revalidate: 0 } },
        );
        const ts = (await tsRes.json()) as TextSearchResponse;
        const first = ts.results?.[0];
        if (ts.status === 'OK' && first) {
          const resolvedId = usablePlacesPlaceId(first.place_id);
          if (resolvedId) {
            const details = await fetchPlaceDetails(key, resolvedId);
            if (details) {
              return NextResponse.json({ ok: true, ...details });
            }
          }
          if (first.name?.trim() && first.geometry?.location) {
            const la = first.geometry.location.lat;
            const lo = first.geometry.location.lng;
            if (typeof la === 'number' && typeof lo === 'number') {
              return NextResponse.json({
                ok: true,
                name: first.name.trim(),
                lat: la,
                lng: lo,
                types: first.types ?? [],
              });
            }
          }
        }
      }
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Mekan bulunamadı' }, { status: 502 });
  }

  return NextResponse.json({ ok: false, error: 'Mekan bulunamadı' }, { status: 404 });
}
