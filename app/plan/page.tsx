'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccommodationPlan } from '@/components/AccommodationPlan';
import { DayCard } from '@/components/DayCard';
import PdfExport, { type PdfExpenses } from '@/components/PdfExport';
import {
  ReservationModal,
  normalizeStoredReservationData,
  type ReservationData,
} from '@/components/ReservationModal';
import { assignBookingUrlsToHotelSuggestions } from '@/lib/booking';
import { mapLegacyDepartureToIata, normalizeDepartureIata } from '@/lib/departure-airports';
import { buildSkyscannerTasimaUrl } from '@/lib/iata';
import {
  mergeBudgetIncludes,
  mergeGroupDetails,
  type PlanRequest,
  type StoredTrip,
  type TripPlan,
} from '@/types';

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

function reservationsStorageKey(req: PlanRequest): string {
  return `gezle-reservations:${req.startDate}:${req.endDate}:${encodeURIComponent(req.destination)}`;
}

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
    groupDetails: mergeGroupDetails(r.people, r.groupDetails),
    tripType: r.tripType,
    budget: r.budget,
    budgetIncludes: mergeBudgetIncludes(r.budgetIncludes),
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
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [expenses, setExpenses] = useState<PdfExpenses>({
    ucak: '',
    konaklama: '',
    aracKiralama: '',
    yemeIcme: '',
    alisveris: '',
    diger: '',
  });
  const [showExpenses, setShowExpenses] = useState(false);
  const [reservationData, setReservationData] = useState<ReservationData>({ hotels: [] });
  const [showReservations, setShowReservations] = useState(false);

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < 768;
      setIsNarrowViewport(narrow);
      if (!narrow) setMobileView('list');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const mapDefaultZoom = isNarrowViewport ? 12 : 13;

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
          const pending = JSON.parse(pendingRaw) as Partial<PlanRequest>;
          if (!pending.people || !pending.destination) throw new Error('invalid');
          request = {
            ...(pending as PlanRequest),
            groupDetails: mergeGroupDetails(pending.people, pending.groupDetails),
            budgetIncludes: mergeBudgetIncludes(pending.budgetIncludes),
          };
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

  useEffect(() => {
    if (!data) return;
    const key = reservationsStorageKey(data.request);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setReservationData(normalizeStoredReservationData(JSON.parse(raw)));
      } else {
        setReservationData({ hotels: [] });
      }
    } catch {
      setReservationData({ hotels: [] });
    }
  }, [data]);

  const persistReservations = useCallback(
    (next: ReservationData) => {
      if (!data) return;
      const key = reservationsStorageKey(data.request);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      setReservationData(next);
    },
    [data],
  );

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
      groupDetails: data.request.groupDetails,
    });
  }, [data]);

  const hotelSuggestionsForDisplay = useMemo(() => {
    if (!data?.plan?.hotelSuggestions?.length) return [];
    return assignBookingUrlsToHotelSuggestions(data.plan.hotelSuggestions, data.request);
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
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f8f8f7] md:flex-row">
      <aside
        className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-b border-[#e5e7eb] bg-white md:w-[380px] md:flex-none md:border-b-0 md:border-r ${
          mobileView === 'map' ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div
          style={{
            fontSize: 10,
            padding: '4px 10px',
            background: 'rgba(255,193,7,0.08)',
            border: '0.5px solid rgba(255,193,7,0.25)',
            borderRadius: 6,
            color: 'rgba(92, 70, 0, 0.88)',
            marginBottom: 8,
            lineHeight: 1.45,
          }}
          className="shrink-0"
        >
          ⚠️ Mekanları ziyaret öncesi Google Maps{"'"}ten kontrol edin.
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-0">
          <AccommodationPlan suggestions={hotelSuggestionsForDisplay} planRequest={req} />

          <div className="mb-3 flex flex-col gap-2 px-3 pt-1 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowExpenses(true)}
              className="w-full flex-1 rounded-lg border border-[rgba(29,158,117,0.3)] bg-[rgba(29,158,117,0.1)] px-3 py-2 text-left text-[12px] font-medium text-[#5dcaa5] transition-opacity hover:opacity-90"
            >
              💰 Harcama Planlayıcı
            </button>
            <button
              type="button"
              onClick={() => setShowReservations(true)}
              className="w-full flex-1 rounded-lg border border-[rgba(99,102,241,0.35)] bg-[rgba(99,102,241,0.12)] px-3 py-2 text-left text-[12px] font-medium text-[#a5b4fc] transition-opacity hover:opacity-90"
            >
              🎫 Rezervasyonlarım
            </button>
          </div>

          <header className="border-b border-[#e5e7eb] p-3">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0f', lineHeight: 1.3 }}>
                  {data.plan.tripTitle?.trim()
                    ? data.plan.tripTitle
                    : `${req.destination} · ${nights} gece · ${dateLine}`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(10,10,15,0.45)', marginTop: 2 }}>
                  {metaPeople} · {metaCar} · Kalkış: {req.departureIata}
                </div>
              </div>
              <div className="shrink-0">
                <PdfExport
                  plan={data.plan}
                  request={data.request}
                  expenses={expenses}
                  reservationData={reservationData}
                  compact
                />
              </div>
            </div>
            {!req.hasTicket ? (
              <a
                href={skyscannerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-10 w-full items-center justify-center rounded-[10px] border border-[#1d9e75]/35 bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] text-[14px] font-semibold text-[#065f46] shadow-[0_1px_2px_rgba(6,95,70,0.08)] transition-all hover:border-[#1d9e75]/55 hover:from-[#d1fae5] hover:to-[#a7f3d0] hover:shadow-[0_2px_8px_rgba(29,158,117,0.18)] active:scale-[0.99]"
              >
                {req.budgetIncludes.flight ? 'Uçuş Bul (Skyscanner)' : 'Uçuş Bul'}
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

          <div className="p-3">
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

      <main
        className={`relative w-full flex-1 overflow-hidden bg-[#e5e7eb] md:min-h-0 ${
          mobileView === 'list' ? 'hidden min-h-0 md:block' : 'flex min-h-0 flex-1 flex-col'
        }`}
      >
        {activeDay ? (
          <div className="absolute inset-0 min-h-0">
            <MapView
              mapQuery={activeDay.mapQuery}
              activities={activeDay.activities}
              dayNumber={activeDay.dayNumber}
              removedIds={removedIds}
              selectedIndex={selectedActivityIndex}
              onMarkerClick={setSelectedActivityIndex}
              onSelectionClear={() => setSelectedActivityIndex(null)}
              className="h-full w-full min-h-0"
              defaultZoom={mapDefaultZoom}
              isMobile={isNarrowViewport}
            />
          </div>
        ) : null}
      </main>

      {showExpenses ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExpenses(false);
          }}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-2xl p-6"
            style={{
              background: '#111118',
              border: '0.5px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expenses-modal-title"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div id="expenses-modal-title" style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                💰 Harcama Planlayıcı
              </div>
              <button
                type="button"
                onClick={() => setShowExpenses(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 18,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {(
              [
                { key: 'ucak' as const, label: '✈️ Uçak Bileti' },
                { key: 'konaklama' as const, label: '🏨 Konaklama' },
                { key: 'aracKiralama' as const, label: '🚗 Araç Kiralama' },
                { key: 'yemeIcme' as const, label: '🍽️ Yeme-İçme' },
                { key: 'alisveris' as const, label: '🛍️ Alışveriş' },
                { key: 'diger' as const, label: '🎯 Diğer' },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={expenses[item.key]}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/[^0-9]/g, '');
                      setExpenses((prev) => ({ ...prev, [item.key]: numbers }));
                    }}
                    style={{
                      width: 110,
                      padding: '7px 28px 7px 10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 13,
                      textAlign: 'right',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 8,
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.4)',
                      pointerEvents: 'none',
                    }}
                  >
                    ₺
                  </span>
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '0.5px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Toplam</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#5dcaa5' }}>
                {new Intl.NumberFormat('tr-TR').format(
                  Object.values(expenses)
                    .map((v) => Number(v) || 0)
                    .reduce((a, b) => a + b, 0),
                )}{' '}
                ₺
              </span>
            </div>

            {req.budget &&
              Object.values(expenses).some((v) => v) &&
              (() => {
                const total = Object.values(expenses)
                  .map((v) => Number(v) || 0)
                  .reduce((a, b) => a + b, 0);
                const budgetParsed = Number(String(req.budget).replace(/\D/g, ''));
                if (!Number.isFinite(budgetParsed) || budgetParsed <= 0) return null;
                const diff = budgetParsed - total;
                const isOver = diff < 0;
                return (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      background: isOver ? 'rgba(239,68,68,0.08)' : 'rgba(29,158,117,0.08)',
                      border: `0.5px solid ${isOver ? 'rgba(239,68,68,0.3)' : 'rgba(29,158,117,0.3)'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: isOver ? '#f87171' : '#5dcaa5',
                      textAlign: 'center',
                    }}
                  >
                    {isOver
                      ? `⚠️ Bütçeni ${new Intl.NumberFormat('tr-TR').format(Math.abs(diff))} ₺ aştın`
                      : `✅ Bütçenden ${new Intl.NumberFormat('tr-TR').format(diff)} ₺ kaldı`}
                  </div>
                );
              })()}

            <button
              type="button"
              onClick={() => setShowExpenses(false)}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px',
                background: '#1d9e75',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Kaydet
            </button>
          </div>
        </div>
      ) : null}

      <ReservationModal
        open={showReservations}
        onClose={() => setShowReservations(false)}
        reservationData={reservationData}
        onSave={(next) => persistReservations(next)}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-[100] flex gap-2 border-t border-white/10 bg-[#0a0a0f] px-4 py-2 md:hidden"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        role="tablist"
        aria-label="Plan görünümü"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'list'}
          onClick={() => setMobileView('list')}
          className={`flex-1 cursor-pointer rounded-[10px] border-0 py-2.5 text-[13px] font-medium text-white ${
            mobileView === 'list' ? 'bg-[#1d9e75]' : 'bg-white/[0.06]'
          }`}
        >
          📋 Plan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'map'}
          onClick={() => setMobileView('map')}
          className={`flex-1 cursor-pointer rounded-[10px] border-0 py-2.5 text-[13px] font-medium text-white ${
            mobileView === 'map' ? 'bg-[#1d9e75]' : 'bg-white/[0.06]'
          }`}
        >
          🗺️ Harita
        </button>
      </div>
    </div>
  );
}
