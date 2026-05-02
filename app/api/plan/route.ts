import { NextResponse } from 'next/server';
import { normalizeDepartureIata } from '@/lib/departure-airports';
import { buildUserMessage, generateTripPlan, resolveTripCities } from '@/lib/claude';
import {
  formatPlacesLinesFromRadius,
  getCityCoords,
  getNearbyPlaces,
} from '@/lib/opentripmap';
import type { PlanRequest } from '@/types';

function isValidPeople(v: unknown): v is PlanRequest['people'] {
  return (
    v === 'yalniz' || v === 'cift' || v === 'aile' || v === 'arkadasgrubu'
  );
}

function isValidTripType(v: unknown): v is PlanRequest['tripType'] {
  return v === 'tarih' || v === 'deniz' || v === 'doga' || v === 'karma';
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

    const planRequest: PlanRequest = {
      destination,
      departureIata,
      startDate,
      endDate,
      people,
      tripType,
      budget,
      hasRentalCar,
      hasTicket,
      ...(hasTicket ? { arrivalTime, departureTime } : {}),
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

    const allLines: string[] = [];
    const lineKeys = new Set<string>();
    const otmKey = process.env.OPENTRIPMAP_API_KEY;

    if (otmKey) {
      for (const city of cities) {
        try {
          const geo = await getCityCoords(city);
          if ('error' in geo && geo.error) {
            console.warn('[opentripmap] geoname', city, geo.error);
            continue;
          }
          const lat = geo.lat;
          const lon = geo.lon ?? geo.lng;
          if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
            continue;
          }
          const nearby = await getNearbyPlaces(lat, lon, 5000, 20);
          if ('error' in nearby && nearby.error) {
            console.warn('[opentripmap] radius', city, nearby.error);
            continue;
          }
          const chunk = formatPlacesLinesFromRadius(nearby);
          for (const line of chunk) {
            const key = line.toLowerCase();
            if (lineKeys.has(key)) continue;
            lineKeys.add(key);
            allLines.push(line);
          }
        } catch (e) {
          console.error('[opentripmap]', city, e);
        }
      }
    }

    const placesText = allLines.join('\n');
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
