import { NextResponse } from 'next/server';
import { normalizeDepartureIata } from '@/lib/departure-airports';
import { buildUserMessage, generateTripPlan, resolveTripCities } from '@/lib/claude';
import {
  fetchWithTimeout,
  formatPlacesLinesFromRadius,
  getCityCoords,
  getNearbyPlaces,
} from '@/lib/opentripmap';
import { mergeBudgetIncludes, type BudgetIncludes, type PlanRequest } from '@/types';

function isValidPeople(v: unknown): v is PlanRequest['people'] {
  return (
    v === 'yalniz' || v === 'cift' || v === 'aile' || v === 'arkadasgrubu'
  );
}

function isValidTripType(v: unknown): v is PlanRequest['tripType'] {
  return v === 'tarih' || v === 'deniz' || v === 'doga' || v === 'karma';
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const cityFallbackCoords: Record<string, { lat: number; lng: number }> = {
  Kotor: { lat: 42.4247, lng: 18.7712 },
  Budva: { lat: 42.2864, lng: 18.84 },
  'Herceg Novi': { lat: 42.4531, lng: 18.5375 },
  Podgorica: { lat: 42.4304, lng: 19.2594 },
  Tivat: { lat: 42.4347, lng: 18.7133 },
};

const OTM_TIMEOUT_MS = 4000;

function fallbackCoordsForCity(city: string): { lat: number; lng: number } | null {
  const t = city.trim();
  if (cityFallbackCoords[t]) return cityFallbackCoords[t];
  const key = Object.keys(cityFallbackCoords).find((k) => k.toLowerCase() === t.toLowerCase());
  return key ? cityFallbackCoords[key] : null;
}

function fallbackCitiesFromDestination(destination: string): string[] {
  const parts = destination
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3);
  return [destination.trim()].filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
    const departureIata = normalizeDepartureIata(body.departureIata);
    const startDate = typeof body.startDate === 'string' ? body.startDate : '';
    const endDate = typeof body.endDate === 'string' ? body.endDate : '';
    const budget = typeof body.budget === 'string' ? body.budget.trim() : '';
    const people = body.people;
    const tripType = body.tripType;
    const hasRentalCar = Boolean(body.hasRentalCar);
    const hasTicket = Boolean(body.hasTicket);
    const arrivalTime = typeof body.arrivalTime === 'string' ? body.arrivalTime.trim() : '';
    const departureTime = typeof body.departureTime === 'string' ? body.departureTime.trim() : '';
    const timeOk = (t: string) => /^\d{2}:\d{2}$/.test(t);

    if (!destination || !startDate || !endDate || !budget) {
      return NextResponse.json(
        { error: 'Eksik alanlar: destinasyon, tarihler ve bütçe gerekli.' },
        { status: 400 }
      );
    }

    if (!isValidPeople(people) || !isValidTripType(tripType)) {
      return NextResponse.json({ error: 'Geçersiz kişi veya tatil tipi.' }, { status: 400 });
    }

    if (hasTicket && (!timeOk(arrivalTime) || !timeOk(departureTime))) {
      return NextResponse.json(
        { error: 'Bilet seçiliyken gidiş iniş ve dönüş kalkış saatlerini HH:MM formatında girin.' },
        { status: 400 }
      );
    }

    const destAirRaw =
      typeof body.destinationAirportIata === 'string' ? body.destinationAirportIata.trim().toUpperCase() : '';
    const destinationAirportIata =
      destAirRaw.length === 3 && /^[A-Z]{3}$/.test(destAirRaw) ? destAirRaw : undefined;

    const planRequest: PlanRequest = {
      destination,
      departureIata,
      startDate,
      endDate,
      people,
      tripType,
      budget,
      budgetIncludes: mergeBudgetIncludes(body.budgetIncludes as Partial<BudgetIncludes> | undefined),
      hasRentalCar,
      hasTicket,
      ...(hasTicket ? { arrivalTime, departureTime } : {}),
      ...(destinationAirportIata ? { destinationAirportIata } : {}),
    };

    let cities: string[] = [];
    try {
      cities = await resolveTripCities(planRequest);
    } catch (e) {
      console.warn('[api/plan] resolveTripCities', e);
    }
    if (!cities.length) {
      cities = fallbackCitiesFromDestination(destination);
    }

    const lineKeys = new Set<string>();
    const otmKey = process.env.OPENTRIPMAP_API_KEY;

    const allLines: string[] = [];
    if (otmKey) {
      for (const city of cities) {

        let lat: number | undefined;
        let lng: number | undefined;

        try {
          const geo = await fetchWithTimeout(getCityCoords(city), OTM_TIMEOUT_MS);
          if ('error' in geo && geo.error) {
            console.warn('[opentripmap] geoname', city, geo.error);
          } else {
            const la = geo.lat;
            const lo = geo.lon ?? geo.lng;
            if (la != null && lo != null && !Number.isNaN(la) && !Number.isNaN(lo)) {
              lat = la;
              lng = lo;
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === 'timeout') {
            console.warn('[opentripmap] geoname timeout', city);
          } else {
            console.error('[opentripmap] geoname', city, e);
          }
        }

        if (lat == null || lng == null) {
          const fb = fallbackCoordsForCity(city);
          if (fb) {
            lat = fb.lat;
            lng = fb.lng;
          }
        }

        if (lat == null || lng == null) {
          await delay(500);
          continue;
        }

        let nearby: Awaited<ReturnType<typeof getNearbyPlaces>>;
        try {
          nearby = await fetchWithTimeout(getNearbyPlaces(lat, lng, 5000, 50), OTM_TIMEOUT_MS);
          if ('error' in nearby && nearby.error) {
            console.warn('[opentripmap] radius', city, nearby.error);
            throw new Error(String(nearby.error));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === 'timeout') {
            console.warn('[opentripmap] radius timeout', city);
          } else {
            console.error('[opentripmap] radius', city, e);
          }
          const fb = fallbackCoordsForCity(city);
          if (fb && (fb.lat !== lat || fb.lng !== lng)) {
            try {
              nearby = await fetchWithTimeout(getNearbyPlaces(fb.lat, fb.lng, 5000, 50), OTM_TIMEOUT_MS);
              if ('error' in nearby && nearby.error) {
                console.warn('[opentripmap] radius fallback', city, nearby.error);
                nearby = { features: [] };
              }
            } catch {
              nearby = { features: [] };
            }
          } else {
            nearby = { features: [] };
          }
        }

        for (const line of formatPlacesLinesFromRadius(nearby)) {
          const key = line.toLowerCase();
          if (lineKeys.has(key)) continue;
          lineKeys.add(key);
          allLines.push(line);
        }

        await delay(500);
      }
    }

    const topPlaces = allLines.slice(0, 40);
    const placesText = topPlaces.join('\n');
    const prompt = buildUserMessage(planRequest, placesText);
    console.log('OpenTripMap mekan listesi:', placesText);
    console.log('Claude prompt:', prompt);

    const plan = await generateTripPlan(planRequest, placesText);
    return NextResponse.json(plan);
  } catch (e) {
    console.error('[api/plan]', e);
    return NextResponse.json(
      { error: 'Plan oluşturulamadı, tekrar dene.' },
      { status: 500 }
    );
  }
}
