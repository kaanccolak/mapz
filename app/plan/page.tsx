'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthModal } from '@/components/AuthModal';
import PdfExport, { type PdfExpenses } from '@/components/PdfExport';
import { PlanViewLayout } from '@/components/PlanViewLayout';
import { normalizeStoredReservationData, type ReservationData } from '@/components/ReservationModal';
import { assignBookingUrlsToHotelSuggestions } from '@/lib/booking';
import { mapLegacyDepartureToIata, normalizeDepartureIata } from '@/lib/departure-airports';
import { useAuth } from '@/lib/AuthContext';
import { buildSkyscannerTasimaUrl } from '@/lib/iata';
import {
  getGidiyomQueryCount,
  incrementGidiyomQueryCountAfterSuccess,
  LONG_TRIP_LOGIN_MESSAGE,
  MAX_TRIAL_PLANS,
  TRIAL_LIMIT_DESCRIPTION,
  TRIAL_LIMIT_TITLE,
} from '@/lib/gezleLimits';
import { nightsBetween } from '@/lib/planDisplayMeta';
import { getPlan, savePlan } from '@/lib/planService';
import {
  mergeBudgetIncludes,
  mergeGroupDetails,
  type PlanRequest,
  type StoredTrip,
  type TripPlan,
} from '@/types';

const STORAGE_KEY = 'gezle-trip';
const PLAN_REQUEST_KEY = 'planRequest';

const EMPTY_EXPENSES: PdfExpenses = {
  ucak: '',
  konaklama: '',
  aracKiralama: '',
  yemeIcme: '',
  alisveris: '',
  diger: '',
};

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
        <p className="mt-2 text-center text-[12px] text-white/30">Plan oluşturulması 1 dakika sürebilir</p>
      </div>
    </div>
  );
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
  const { currentUser, loading: authLoading, firebaseReady } = useAuth();
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
  const [urlSavedPlanId, setUrlSavedPlanId] = useState<string | null>(null);
  const [savedFirestorePlanId, setSavedFirestorePlanId] = useState<string | null>(null);
  const [savedShareId, setSavedShareId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null);
  const [planAuthOpen, setPlanAuthOpen] = useState(false);
  const loadedFirestoreSavedId = useRef<string | null>(null);

  useEffect(() => {
    setUrlSavedPlanId(new URLSearchParams(window.location.search).get('saved'));
  }, []);

  useEffect(() => {
    if (!mounted || authLoading || !urlSavedPlanId) return;
    if (!currentUser) return;
    if (loadedFirestoreSavedId.current === urlSavedPlanId) return;
    loadedFirestoreSavedId.current = urlSavedPlanId;

    let cancelled = false;
    void (async () => {
      try {
        const p = await getPlan(urlSavedPlanId);
        if (cancelled) return;
        if (!p || p.userId !== currentUser.uid) {
          setBootstrapError('Plan bulunamadı veya bu hesaba ait değil.');
          loadedFirestoreSavedId.current = null;
          router.replace('/plan');
          return;
        }
        setData({ plan: p.planData, request: p.requestSnapshot });
        setExpenses({ ...EMPTY_EXPENSES, ...(p.expenseData ?? {}) });
        setReservationData(normalizeStoredReservationData(p.reservationData ?? { hotels: [] }));
        setRemovedIds(new Set());
        setActiveDayIndex(0);
        setSavedFirestorePlanId(urlSavedPlanId);
        setSavedShareId(p.shareId || null);
        setSaveStatus('saved');
        setSaveErrorDetail(null);
        router.replace('/plan', { scroll: false });
      } catch {
        if (!cancelled) {
          setBootstrapError('Plan yüklenemedi.');
          loadedFirestoreSavedId.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, authLoading, currentUser, urlSavedPlanId, router]);

  const handleSaveToCloud = useCallback(async () => {
    if (!currentUser || !data) return;
    setSaveStatus('saving');
    setSaveErrorDetail(null);
    try {
      const { planId, shareId } = await savePlan(currentUser.uid, {
        plan: data.plan,
        request: data.request,
        reservationData,
        expenseData: expenses,
        existingPlanId: savedFirestorePlanId,
        existingShareId: savedShareId,
      });
      setSavedFirestorePlanId(planId);
      setSavedShareId(shareId);
      setSaveStatus('saved');
      setSaveErrorDetail(null);
    } catch (err) {
      console.error('[savePlan] Firestore kaydı başarısız:', err);
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message ?? '')
            : 'Bilinmeyen hata';
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code ?? '') : '';
      setSaveErrorDetail(code ? `${code}: ${msg}` : msg || 'Kayıt başarısız');
      setSaveStatus('error');
    }
  }, [currentUser, data, reservationData, expenses, savedFirestorePlanId, savedShareId]);

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

    let cancelled = false;

    async function bootstrap() {
      const pendingRaw = localStorage.getItem(PLAN_REQUEST_KEY);
      if (pendingRaw && authLoading) {
        if (!cancelled) setMounted(true);
        return;
      }

      hasFetched.current = true;
      setBootstrapError(null);

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

        if (getGidiyomQueryCount() >= MAX_TRIAL_PLANS) {
          localStorage.removeItem(PLAN_REQUEST_KEY);
          if (!cancelled) {
            setData(null);
            setBootstrapError(`${TRIAL_LIMIT_TITLE}\n\n${TRIAL_LIMIT_DESCRIPTION}`);
            setMounted(true);
          }
          return;
        }

        if (!authLoading && !currentUser && nightsBetween(request.startDate, request.endDate) > 4) {
          localStorage.removeItem(PLAN_REQUEST_KEY);
          if (!cancelled) {
            setData(null);
            setBootstrapError(
              `${LONG_TRIP_LOGIN_MESSAGE}\n\n4 geceden uzun planlar için ana sayfada giriş yapmanız gerekir.`,
            );
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
          incrementGidiyomQueryCountAfterSuccess();
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
  }, [authLoading, currentUser]);

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
          <p
            className="max-w-md whitespace-pre-line text-center text-[15px] text-red-600"
            role="alert"
          >
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

  return (
    <>
      <PlanViewLayout
        data={data}
        hotelSuggestionsForDisplay={hotelSuggestionsForDisplay}
        skyscannerUrl={skyscannerUrl}
        expenses={expenses}
        setExpenses={setExpenses}
        reservationData={reservationData}
        persistReservations={persistReservations}
        removedIds={removedIds}
        removeActivity={removeActivity}
        restoreActivity={restoreActivity}
        activeDayIndex={activeDayIndex}
        setActiveDayIndex={setActiveDayIndex}
        selectedActivityIndex={selectedActivityIndex}
        setSelectedActivityIndex={setSelectedActivityIndex}
        mobileView={mobileView}
        setMobileView={setMobileView}
        isNarrowViewport={isNarrowViewport}
        mapDefaultZoom={mapDefaultZoom}
        showExpenses={showExpenses}
        setShowExpenses={setShowExpenses}
        showReservations={showReservations}
        setShowReservations={setShowReservations}
        savedPlanLoginBanner={
          urlSavedPlanId && !authLoading && !currentUser ? (
            <div className="mx-3 mb-2 rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-center text-[12px] leading-snug text-amber-950">
              Kayıtlı planı açmak için{' '}
              <button
                type="button"
                className="font-semibold text-[#15805d] underline underline-offset-2"
                onClick={() => setPlanAuthOpen(true)}
              >
                giriş yapın
              </button>
            </div>
          ) : null
        }
        pdfExportSlot={
          <PdfExport
            plan={data.plan}
            request={data.request}
            expenses={expenses}
            reservationData={reservationData}
            shareId={savedShareId}
            compact
          />
        }
        saveActionRow={
          <>
            {!authLoading && !firebaseReady ? (
              <span className="text-[11px] text-[#9ca3af]">
                Plan kaydı için .env.local içinde Firebase anahtarları gerekli.
              </span>
            ) : currentUser ? (
              <div className="flex min-w-0 w-full max-w-full flex-col gap-1">
                <button
                  type="button"
                  onClick={() => void handleSaveToCloud()}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className={`w-fit rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
                    saveStatus === 'saved'
                      ? 'cursor-default border border-[#1d9e75]/40 bg-[#ecfdf5] text-[#065f46]'
                      : saveStatus === 'error'
                        ? 'border border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
                        : 'border border-[#1d9e75]/35 bg-[#1d9e75] text-white hover:bg-[#178f68] disabled:opacity-60'
                  }`}
                >
                  {saveStatus === 'saved'
                    ? 'Kaydedildi ✓'
                    : saveStatus === 'saving'
                      ? 'Kaydediliyor…'
                      : saveStatus === 'error'
                        ? 'Tekrar dene'
                        : 'Planı Kaydet'}
                </button>
                {saveStatus === 'error' && saveErrorDetail ? (
                  <p className="max-w-full break-words text-[11px] leading-snug text-red-600" role="alert">
                    {saveErrorDetail}
                  </p>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPlanAuthOpen(true)}
                className="rounded-lg border border-[#e5e7eb] bg-[#f8f8f7] px-3 py-2 text-[12px] font-medium text-[#374151] transition hover:bg-[#eef0f2]"
              >
                Kaydetmek için giriş yap
              </button>
            )}
          </>
        }
      />
      <AuthModal open={planAuthOpen} onClose={() => setPlanAuthOpen(false)} />
    </>
  );
}
