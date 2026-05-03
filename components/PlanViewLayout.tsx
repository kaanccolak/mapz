'use client';

import dynamic from 'next/dynamic';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { AccommodationPlan } from '@/components/AccommodationPlan';
import { DayCard } from '@/components/DayCard';
import type { PdfExpenses } from '@/components/PdfExport';
import { ReservationModal, type ReservationData } from '@/components/ReservationModal';
import { formatTripDates, nightsBetween, peopleLabels } from '@/lib/planDisplayMeta';
import type { HotelSuggestion, StoredTrip } from '@/types';

const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-[#f8f8f7] text-sm text-[#6b7280]">
      Harita yükleniyor…
    </div>
  ),
});

export type PlanViewLayoutProps = {
  data: StoredTrip;
  hotelSuggestionsForDisplay: HotelSuggestion[];
  skyscannerUrl: string;
  expenses: PdfExpenses;
  setExpenses: Dispatch<SetStateAction<PdfExpenses>>;
  reservationData: ReservationData;
  persistReservations: (next: ReservationData) => void;
  removedIds: Set<string>;
  removeActivity: (id: string) => void;
  restoreActivity: (id: string) => void;
  activeDayIndex: number;
  setActiveDayIndex: (i: number) => void;
  selectedActivityIndex: number | null;
  setSelectedActivityIndex: (i: number | null) => void;
  mobileView: 'list' | 'map';
  setMobileView: (v: 'list' | 'map') => void;
  isNarrowViewport: boolean;
  mapDefaultZoom: number;
  showExpenses: boolean;
  setShowExpenses: (v: boolean) => void;
  showReservations: boolean;
  setShowReservations: (v: boolean) => void;
  /** Paylaşım görünümü: aktivite kaldırma/gizleme kapalı */
  readOnly?: boolean;
  /** Plan sayfası: kayıtlı plan + giriş uyarısı */
  savedPlanLoginBanner?: ReactNode;
  /** Paylaşım şeridi vb. */
  modeBanner?: ReactNode;
  /** PdfExport veya özel aksiyonlar (sağ üst) */
  pdfExportSlot: ReactNode;
  /** Planı Kaydet satırı; yoksa gösterilmez */
  saveActionRow?: ReactNode;
};

export function PlanViewLayout({
  data,
  hotelSuggestionsForDisplay,
  skyscannerUrl,
  expenses,
  setExpenses,
  reservationData,
  persistReservations,
  removedIds,
  removeActivity,
  restoreActivity,
  activeDayIndex,
  setActiveDayIndex,
  selectedActivityIndex,
  setSelectedActivityIndex,
  mobileView,
  setMobileView,
  isNarrowViewport,
  mapDefaultZoom,
  showExpenses,
  setShowExpenses,
  showReservations,
  setShowReservations,
  readOnly = false,
  savedPlanLoginBanner = null,
  modeBanner = null,
  pdfExportSlot,
  saveActionRow = null,
}: PlanViewLayoutProps) {
  const req = data.request;
  const nights = nightsBetween(req.startDate, req.endDate);
  const dateLine = formatTripDates(req);
  const metaPeople = peopleLabels[req.people];
  const metaCar = req.hasRentalCar ? 'Araçlı' : 'Araçsız';
  const activeDay = data.plan.days[activeDayIndex];

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-[#f8f8f7] md:flex-row">
      <aside
        className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-b border-[#e5e7eb] bg-white md:w-[380px] md:flex-none md:border-b-0 md:border-r ${
          mobileView === 'map' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {modeBanner}
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
        {savedPlanLoginBanner}
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
              <div className="shrink-0">{pdfExportSlot}</div>
            </div>
            {saveActionRow ? <div className="mt-2 flex flex-wrap items-center gap-2 px-3">{saveActionRow}</div> : null}
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
                  readOnly={readOnly}
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
