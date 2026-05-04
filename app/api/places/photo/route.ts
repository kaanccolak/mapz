import { NextRequest, NextResponse } from 'next/server';

function mapsKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export async function GET(req: NextRequest) {
  const key = mapsKey();
  if (!key) {
    return new NextResponse(null, { status: 500 });
  }

  const ref = (
    req.nextUrl.searchParams.get('ref') ??
    req.nextUrl.searchParams.get('reference') ??
    ''
  ).trim();
  if (!ref) {
    return new NextResponse(null, { status: 400 });
  }

  const maxwidth = req.nextUrl.searchParams.get('maxwidth') ?? '400';
  const params = new URLSearchParams({
    maxwidth: /^\d+$/.test(maxwidth) ? maxwidth : '400',
    photo_reference: ref,
    key,
  });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }
    const ct = res.headers.get('content-type') ?? 'image/jpeg';
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
