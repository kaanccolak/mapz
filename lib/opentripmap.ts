export function fetchWithTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

type GeonameResponse = {
  lat?: number;
  lon?: number;
  lng?: number;
  name?: string;
  error?: string;
};

type RadiusFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: { name?: string; kinds?: string; xid?: string };
};

type RadiusResponse = {
  features?: RadiusFeature[];
  error?: string;
};

// Şehir adından koordinat al (timeout çağıran tarafında fetchWithTimeout ile sarılmalı)
export async function getCityCoords(cityName: string): Promise<GeonameResponse> {
  const key = process.env.OPENTRIPMAP_API_KEY;
  if (!key) {
    return { error: 'OPENTRIPMAP_API_KEY tanımlı değil' };
  }
  const res = await fetch(
    `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(cityName)}&apikey=${key}`
  );
  return (await res.json()) as GeonameResponse;
}

// Koordinat çevresindeki turistik yerleri getir
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  radius = 5000,
  limit = 20
): Promise<RadiusResponse> {
  const key = process.env.OPENTRIPMAP_API_KEY;
  if (!key) {
    return { error: 'OPENTRIPMAP_API_KEY tanımlı değil' };
  }
  const res = await fetch(
    `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lng}&lat=${lat}&kinds=interesting_places,foods,cultural,natural,historic&limit=${limit}&apikey=${key}`
  );
  return (await res.json()) as RadiusResponse;
}

/** OpenTripMap radius yanıtından prompt satırları üret */
export function formatPlacesLinesFromRadius(radiusJson: RadiusResponse): string[] {
  const lines: string[] = [];
  const features = radiusJson.features;
  if (!features?.length) return lines;

  for (const f of features) {
    const name = f.properties?.name?.trim();
    const kindsRaw = f.properties?.kinds?.trim();
    const kategori = kindsRaw ? kindsRaw.split(',').map((k) => k.trim()).filter(Boolean).join(', ') : 'place';
    const coords = f.geometry?.coordinates;
    if (!name || !coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }
    lines.push(`- ${name} | lat: ${lat}, lng: ${lng} | kategori: ${kategori}`);
  }
  return lines;
}

export function tripNightsBetween(startDate: string, endDate: string): number {
  const a = new Date(`${startDate}T12:00:00`);
  const b = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 3;
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
