import { NextRequest, NextResponse } from 'next/server';

function mapsKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export async function GET(req: NextRequest) {
  const key = mapsKey();
  if (!key) {
    return NextResponse.json({ error: 'Maps API anahtarı yok' }, { status: 500 });
  }

  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  const name = (req.nextUrl.searchParams.get('name') ?? '').trim();

  if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    return NextResponse.json({ error: 'lat ve lng gerekli' }, { status: 400 });
  }

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: '100',
    key,
  });
  if (name) {
    params.set('keyword', name.slice(0, 200));
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as unknown;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'REQUEST_DENIED' }, { status: 502 });
  }
}
