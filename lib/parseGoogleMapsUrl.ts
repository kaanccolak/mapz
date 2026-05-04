/**
 * Çözümlenmiş (redirect sonrası) Google Haritalar URL'sinden place_id veya koordinat çıkarır.
 */

export type ParsedMapsLink = { placeId?: string; lat?: number; lng?: number };

function num(x: string): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

/** google.com/url?q=... ve consent continue= sarmalayıcılarını aç */
export function unwrapGoogleRedirectUrl(url: string): string {
  const s = url.trim();
  try {
    const u = new URL(s);
    if (u.hostname === 'www.google.com' && u.pathname === '/url') {
      const q = u.searchParams.get('q');
      if (q?.startsWith('http')) return unwrapGoogleRedirectUrl(q);
    }
    const cont = u.searchParams.get('continue');
    if (cont && /map/i.test(cont)) {
      try {
        return unwrapGoogleRedirectUrl(decodeURIComponent(cont));
      } catch {
        return unwrapGoogleRedirectUrl(cont);
      }
    }
  } catch {
    /* keep */
  }
  return s;
}

export function parseGoogleMapsUrl(resolvedUrl: string): ParsedMapsLink {
  const unwrapped = unwrapGoogleRedirectUrl(resolvedUrl);
  let s = unwrapped.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }

  const qPlaceId = /[?&]place_id=([^&]+)/i.exec(s);
  if (qPlaceId?.[1]) {
    const placeId = decodeURIComponent(qPlaceId[1]).trim();
    if (placeId) return { placeId };
  }

  const dataPlace = /!1s(ChIJ[A-Za-z0-9_-]{20,})/.exec(s);
  if (dataPlace?.[1]) return { placeId: dataPlace[1] };

  const chij = /(ChIJ[A-Za-z0-9_-]{20,})/.exec(s);
  if (chij?.[1]) return { placeId: chij[1] };

  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(s);
  if (at) {
    const lat = num(at[1]);
    const lng = num(at[2]);
    if (lat != null && lng != null) return { lat, lng };
  }

  const d3d4 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(s);
  if (d3d4) {
    const lat = num(d3d4[1]);
    const lng = num(d3d4[2]);
    if (lat != null && lng != null) return { lat, lng };
  }

  const qComma = /[?&]q=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/i.exec(s);
  if (qComma) {
    const lat = num(qComma[1]);
    const lng = num(qComma[2]);
    if (lat != null && lng != null) return { lat, lng };
  }
  const qCommaPlain = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)(?:&|$)/i.exec(s);
  if (qCommaPlain) {
    const lat = num(qCommaPlain[1]);
    const lng = num(qCommaPlain[2]);
    if (lat != null && lng != null) return { lat, lng };
  }

  const queryParam = /[?&]query=([^&]+)/i.exec(s);
  if (queryParam?.[1]) {
    const v = decodeURIComponent(queryParam[1]).replace(/\+/g, ' ').trim();
    const coords = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/.exec(v);
    if (coords) {
      const lat = num(coords[1]);
      const lng = num(coords[2]);
      if (lat != null && lng != null) return { lat, lng };
    }
  }

  return {};
}
