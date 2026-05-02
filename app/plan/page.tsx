'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccommodationPlan } from '@/components/AccommodationPlan';
import { DayCard } from '@/components/DayCard';
import { mapLegacyDepartureToIata, normalizeDepartureIata } from '@/lib/departure-airports';
import { buildSkyscannerTasimaUrl } from '@/lib/iata';
import type { PlanRequest, StoredTrip, TripPlan } from '@/types';

const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#f8f8f7] text-sm text-[#6b7280]">
      Harita yükleniyor…
    </div>
  ),
});

const STORAGE_KEY = 'gezle-trip';
const PLAN_REQUEST_KEY = 'planRequest';

const STEPS = [
  { icon: '🗺️', text: 'Konum analiz ediliyor...' },
  { icon: '📍', text: 'Gezilecek yerler keşfediliyor...' },
  { icon: '🤖', text: 'Plan oluşturuyor...' },
  { icon: '🗓️', text: 'Gün gün program hazırlanıyor...' },
  { icon: '✨', text: 'Son rötuşlar yapılıyor...' },
] as const;

function LoadingScreen({ destination }: { destination: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = window.setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 3000);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 95));
    }, 150);

    return () => {
      window.clearInterval(stepInterval);
      window.clearInterval(progressInterval);
    };
  }, []);

  const step = STEPS[currentStep];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-[#0a0a0f]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Plan oluşturuluyor"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(29,158,117,0.12)_0%,transparent_70%)]"
        aria-hidden
      />

      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-[3px] border-white/[0.08]" aria-hidden />
        <div
          className="absolute inset-0 animate-gezle-plan-spin rounded-full border-[3px] border-transparent border-t-[#1d9e75] border-r-[#5dcaa5]"
          aria-hidden
        />
        <div
          className="absolute inset-3 animate-gezle-plan-spin-reverse rounded-full border-2 border-transparent border-t-[rgba(93,202,165,0.4)]"
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">{step.icon}</div>
      </div>

      <div className="text-center">
        <div className="mb-2 text-[13px] uppercase tracking-[0.1em] text-white/40">Planlanıyor</div>
        <div className="text-[28px] font-medium capitalize text-white">{destination}</div>
      </div>

      <div key={currentStep} className="h-6 animate-gezle-step-fade text-sm text-[#5dcaa5]">
        {step.text}
      </div>

      <div className="w-[280px]">
        <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1d9e75] to-[#5dcaa5] transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[12px] text-white/30">Bu işlem 15-20 saniye sürebilir</p>
      </div>
    </div>
  );
}

const peopleLabels: Record<PlanRequest['people'], string> = {
  yalniz: 'Yalnız',
  cift: 'Çift',
  aile: 'Aile',
  arkadasgrubu: 'Arkadaş grubu',
};

function nightsBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const diff = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function formatTripDates(req: PlanRequest): string {
  try {
    const s = new Date(req.startDate);
    const e = new Date(req.endDate);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${s.toLocaleDateString('tr-TR', opts)} – ${e.toLocaleDateString('tr-TR', opts)}`;
  } catch {
    return `${req.startDate} – ${req.endDate}`;
  }
}

type LegacyRequest = PlanRequest & { departureCity?: string };

function normalizeStoredTrip(raw: unknown): StoredTrip | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as StoredTrip;
  if (!o.plan?.days?.length || !o.request) return null;
  const r = o.request as LegacyRequest;
  const departureIata = r.departureIata
    ? normalizeDepartureIata(r.departureIata)
    : mapLegacyDepartureToIata(r.departureCity);
  const hasTicket = typeof r.hasTicket === 'boolean' ? r.hasTicket : false;
  const destAir =
    typeof r.destinationAirportIata === 'string' && /^[A-Za-z]{3}$/.test(r.destinationAirportIata.trim())
      ? r.destinationAirportIata.trim().toUpperCase()
      : undefined;
  const request: PlanRequest = {
    destination: r.destination,
    departureIata,
    startDate: r.startDate,
    endDate: r.endDate,
    people: r.people,
    tripType: r.tripType,
    budget: r.budget,
    hasRentalCar: r.hasRentalCar,
    hasTicket,
    ...(hasTicket && typeof r.arrivalTime === 'string' && typeof r.departureTime === 'string'
      ? { arrivalTime: r.arrivalTime, departureTime: r.departureTime }
      : {}),
    ...(destAir ? { destinationAirportIata: destAir } : {}),
  };
  return { plan: o.plan, request };
}

export default function PlanPage() {
  const router = useRouter();
  const hasFetched = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<StoredTrip | null | undefined>(undefined);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationDestination, setGenerationDestination] = useState('Tatil');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    let cancelled = false;

    async function bootstrap() {
      setBootstrapError(null);
      const pendingRaw = localStorage.getItem(PLAN_REQUEST_KEY);

      if (pendingRaw) {
        let request: PlanRequest;
        try {
          request = JSON.parse(pendingRaw) as PlanRequest;
        } catch {
          localStorage.removeItem(PLAN_REQUEST_KEY);
          if (!cancelled) {
            setData(null);
            setBootstrapError('Kayıtlı istek okunamadı.');
            setMounted(true);
          }
          return;
        }

        if (!cancelled) {
          setGenerationDestination(request.destination?.trim() || 'Tatil');
          setIsGeneratingPlan(true);
          setMounted(true);
        }

        try {
          const res = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errBody.error || 'Plan oluşturulamadı');
          }
          const plan = (await res.json()) as TripPlan;
          if (cancelled) return;
          const stored: StoredTrip = { plan, request };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
          localStorage.removeItem(PLAN_REQUEST_KEY);
          setData(stored);
        } catch (e) {
          if (!cancelled) {
            localStorage.removeItem(PLAN_REQUEST_KEY);
            setData(null);
            setBootstrapError(e instanceof Error ? e.message : 'Plan oluşturulamadı');
          }
        } finally {
          if (!cancelled) setIsGeneratingPlan(false);
        }
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        if (!cancelled) {
          setData(null);
          setMounted(true);
        }
        return;
      }
      try {
        const parsed = normalizeStoredTrip(JSON.parse(raw));
        if (!cancelled) setData(parsed);
      } catch {
        if (!cancelled) setData(null);
      }
      if (!cancelled) setMounted(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const removeActivity = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
  }, []);

  const restoreActivity = useCallback((id: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const activeDay = data?.plan.days[activeDayIndex];

  useEffect(() => {
    setSelectedActivityIndex(null);
  }, [activeDayIndex]);

  const skyscannerUrl = useMemo(() => {
    if (!data) {
      return 'https://www.skyscanner.com.tr/';
    }
    return buildSkyscannerTasimaUrl({
      departureIata: data.request.departureIata,
      destination: data.request.destination,
      destinationAirportIata: data.request.destinationAirportIata,
      startDate: data.request.startDate,
      endDate: data.request.endDate,
      people: data.request.people,
    });
  }, [data]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#0a0a0f]" aria-hidden />;
  }

  if (isGeneratingPlan) {
    return <LoadingScreen destination={generationDestination} />;
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4">
        {bootstrapError ? (
          <p className="max-w-md text-center text-[15px] text-red-600" role="alert">
            {bootstrapError}
          </p>
        ) : (
          <p className="text-[15px] text-[#6b7280]">Kayıtlı plan bulunamadı.</p>
        )}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-[10px] bg-[#1d9e75] px-6 py-2.5 text-[15px] font-medium text-white"
        >
          Ana sayfaya dön
        </button>
      </div>
    );
  }

  if (data === undefined) {
    return <div className="min-h-screen bg-[#f8f8f7]" />;
  }

  const req = data.request;
  const nights = nightsBetween(req.startDate, req.endDate);
  const dateLine = formatTripDates(req);
  const metaPeople = peopleLabels[req.people];
  const metaCar = req.hasRentalCar ? 'Araçlı' : 'Araçsız';

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8f7] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-[#e5e7eb] bg-white lg:w-[380px] lg:border-b-0 lg:border-r">
        <AccommodationPlan suggestions={data.plan.hotelSuggestions} />

        <header className="border-b border-[#e5e7eb] p-4">
          <h1 className="text-[15px] font-medium leading-snug text-[#0a0a0f]">
            {req.destination} · {nights} gece · {dateLine}
          </h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            {metaPeople} · {metaCar} · Kalkış: {req.departureIata}
          </p>
          {data.plan.tripTitle ? (
            <p className="mt-2 text-[12px] text-[#1d9e75]">{data.plan.tripTitle}</p>
          ) : null}
          {!req.hasTicket ? (
            <a
              href={skyscannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-10 w-full items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-white text-[14px] font-medium text-[#0a0a0f] transition-colors hover:bg-[#f8f8f7]"
            >
              Uçuş Bul (Skyscanner)
            </a>
          ) : (
            <p className="mt-3 text-[12px] leading-relaxed text-[#6b7280]">
              Plan, kayıtlı uçuş saatlerinize göre ayarlandı. Yine de{' '}
              <a
                href={skyscannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#1d9e75] underline-offset-2 hover:underline"
              >
                Skyscanner üzerinde uçuşlara bakın
              </a>
              .
            </p>
          )}
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-[#e5e7eb] px-2 py-2">
          {data.plan.days.map((d, i) => (
            <button
              key={d.dayNumber}
              type="button"
              onClick={() => setActiveDayIndex(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                i === activeDayIndex
                  ? 'bg-[#1d9e75] text-white'
                  : 'bg-[#f8f8f7] text-[#0a0a0f] hover:bg-[#e5e7eb]'
              }`}
            >
              {d.date}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            {activeDay ? (
              <div>
                <h2 className="mb-2 text-[15px] font-medium text-[#0a0a0f]">{activeDay.title}</h2>
                <p className="mb-3 text-[12px] text-[#6b7280]">{activeDay.city}</p>
                <DayCard
                  day={activeDay}
                  dayIndex={activeDayIndex}
                  totalDays={data.plan.days.length}
                  hasTicket={req.hasTicket}
                  removedIds={removedIds}
                  onRemove={removeActivity}
                  onRestore={restoreActivity}
                  selectedActivityIndex={selectedActivityIndex}
                  onActivitySelect={setSelectedActivityIndex}
                />
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="relative h-[50vh] min-h-[320px] w-full flex-1 bg-[#e5e7eb] lg:min-h-screen">
        {activeDay ? (
          <div className="absolute inset-0">
            <MapView
              mapQuery={activeDay.mapQuery}
              activities={activeDay.activities}
              dayNumber={activeDay.dayNumber}
              removedIds={removedIds}
              selectedIndex={selectedActivityIndex}
              onMarkerClick={setSelectedActivityIndex}
              onSelectionClear={() => setSelectedActivityIndex(null)}
              className="h-full w-full"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
