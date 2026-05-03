'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PdfExport, { type PdfExpenses } from '@/components/PdfExport';
import { PlanViewLayout } from '@/components/PlanViewLayout';
import { normalizeStoredReservationData, type ReservationData } from '@/components/ReservationModal';
import { assignBookingUrlsToHotelSuggestions } from '@/lib/booking';
import { buildSkyscannerTasimaUrl } from '@/lib/iata';
import { getPlanByShareId } from '@/lib/planService';
import type { StoredTrip } from '@/types';

type Props = { shareId: string };

const EMPTY_EXPENSES: PdfExpenses = {
  ucak: '',
  konaklama: '',
  aracKiralama: '',
  yemeIcme: '',
  alisveris: '',
  diger: '',
};

export function SharePlanClient({ shareId }: Props) {
  const [data, setData] = useState<StoredTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [removedIds] = useState(() => new Set<string>());
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [expenses, setExpenses] = useState<PdfExpenses>(EMPTY_EXPENSES);
  const [showExpenses, setShowExpenses] = useState(false);
  const [reservationData, setReservationData] = useState<ReservationData>({ hotels: [] });
  const [showReservations, setShowReservations] = useState(false);

  const noopRemove = useCallback(() => {}, []);
  const noopRestore = useCallback(() => {}, []);

  const persistReservations = useCallback((next: ReservationData) => {
    setReservationData(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getPlanByShareId(shareId);
        if (cancelled) return;
        if (!p?.planData?.days?.length || !p.requestSnapshot) {
          setError('notfound');
          setData(null);
          return;
        }
        setData({ plan: p.planData, request: p.requestSnapshot });
        setExpenses({ ...EMPTY_EXPENSES, ...(p.expenseData ?? {}) });
        setReservationData(normalizeStoredReservationData(p.reservationData ?? { hotels: [] }));
        setActiveDayIndex(0);
        setSelectedActivityIndex(null);
      } catch {
        if (!cancelled) setError('load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

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

  useEffect(() => {
    setSelectedActivityIndex(null);
  }, [activeDayIndex]);

  const mapDefaultZoom = isNarrowViewport ? 12 : 13;

  const skyscannerUrl = useMemo(() => {
    if (!data) return 'https://www.skyscanner.com.tr/';
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

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0f] text-[14px] text-white/45">
        Yükleniyor…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0f] px-4">
        <p className="text-center text-[15px] text-white/75" role="alert">
          {error === 'notfound' ? 'Plan bulunamadı.' : 'Plan yüklenemedi.'}
        </p>
        <Link
          href="/"
          className="rounded-[10px] bg-[#1d9e75] px-6 py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return (
    <PlanViewLayout
      data={data}
      hotelSuggestionsForDisplay={hotelSuggestionsForDisplay}
      skyscannerUrl={skyscannerUrl}
      expenses={expenses}
      setExpenses={setExpenses}
      reservationData={reservationData}
      persistReservations={persistReservations}
      removedIds={removedIds}
      removeActivity={noopRemove}
      restoreActivity={noopRestore}
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
      readOnly
      modeBanner={
        <div className="mx-3 mb-2 shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-white/55">
          Paylaşılan plan · salt okunur
        </div>
      }
      pdfExportSlot={
        <PdfExport
          plan={data.plan}
          request={data.request}
          expenses={expenses}
          reservationData={reservationData}
          hideShare
          compact
        />
      }
    />
  );
}
