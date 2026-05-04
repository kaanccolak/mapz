import { NextRequest, NextResponse } from 'next/server';

function mapsKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
}

const DETAIL_FIELDS =
  'name,rating,user_ratings_total,photos,reviews,opening_hours,formatted_address,price_level,website,url,editorial_summary';

export async function GET(req: NextRequest) {
  const key = mapsKey();
  if (!key) {
    return NextResponse.json({ error: 'Maps API anahtarı yok' }, { status: 500 });
  }

  const placeId = (req.nextUrl.searchParams.get('placeId') ?? '').trim();
  if (!placeId) {
    return NextResponse.json({ error: 'placeId gerekli' }, { status: 400 });
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: DETAIL_FIELDS,
    language: 'tr',
    key,
  });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'REQUEST_DENIED' }, { status: 502 });
  }
}
