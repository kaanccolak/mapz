/** Places API (Find Place from Text) — kapalı mekan doğrulama; sunucu tarafı GOOGLE_MAPS_API_KEY */

export type PlaceInput = { name: string; location?: string };

/** Google yanıtındaki aday; istemci kodu için dışa açık tip */
export type ValidatedPlace = PlaceInput & {
  place_id?: string;
  business_status?: string;
};

const FIND_PLACE_BASE = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FindPlaceJson = {
  status?: string;
  candidates?: Array<{
    place_id?: string;
    name?: string;
    business_status?: string;
  }>;
};

async function findPlaceFromText(input: string, apiKey: string): Promise<FindPlaceJson | null> {
  const q = new URLSearchParams({
    input,
    inputtype: 'textquery',
    fields: 'place_id,business_status,name',
    key: apiKey,
  });
  try {
    const res = await fetch(`${FIND_PLACE_BASE}?${q.toString()}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as FindPlaceJson;
  } catch {
    return null;
  }
}

/**
 * Her mekan için sırayla Find Place sorgusu.
 * ZERO_RESULTS / hata → mekan geçerli kabul (silinmez).
 * business_status === CLOSED_PERMANENTLY → removed listesine eklenir (benzersiz etiket: "ad (şehir)").
 */
export async function validatePlaces(
  places: PlaceInput[],
  apiKey: string
): Promise<{ valid: ValidatedPlace[]; removed: string[] }> {
  const valid: ValidatedPlace[] = [];
  const removed: string[] = [];

  for (const p of places) {
    const city = (p.location ?? '').trim();
    const input = city ? `${p.name.trim()} ${city}` : p.name.trim();
    const label = city ? `${p.name.trim()} (${city})` : p.name.trim();

    const data = await findPlaceFromText(input, apiKey);

    if (!data || data.status === 'ZERO_RESULTS' || !data.candidates?.length) {
      valid.push({ ...p });
      await sleep(120);
      continue;
    }

    const c = data.candidates[0];
    const bs = c.business_status;

    if (bs === 'CLOSED_PERMANENTLY') {
      removed.push(label);
      await sleep(120);
      continue;
    }

    valid.push({
      ...p,
      place_id: c.place_id,
      business_status: c.business_status,
    });
    await sleep(120);
  }

  return { valid, removed };
}
