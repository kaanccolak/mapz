'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatClockInput, isValidClockTime } from '@/lib/formatClockInput';

export type FlightReservationLeg = {
  airline: string;
  flightNumber: string;
  pnr: string;
  departureTime: string;
};

export interface ReservationData {
  outboundFlight?: FlightReservationLeg;
  returnFlight?: FlightReservationLeg;
  hotels: {
    id: string;
    name: string;
    reservationNumber: string;
    checkIn: string;
    checkInTime: string;
    checkOut: string;
    checkOutTime: string;
  }[];
}

const emptyLeg: FlightReservationLeg = {
  airline: '',
  flightNumber: '',
  pnr: '',
  departureTime: '',
};

function legHasAnyContent(leg?: FlightReservationLeg): boolean {
  if (!leg) return false;
  return [leg.airline, leg.flightNumber, leg.pnr, leg.departureTime].some((v) => String(v).trim());
}

const RETURN_COLLAPSE_MS = 320;

type RawStored = Partial<ReservationData> & { flight?: unknown };

export function newHotelId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeFlightLeg(raw: unknown): FlightReservationLeg | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const x = raw as Record<string, unknown>;
  const leg: FlightReservationLeg = {
    airline: String(x.airline ?? ''),
    flightNumber: String(x.flightNumber ?? ''),
    pnr: String(x.pnr ?? '').toUpperCase(),
    departureTime: String(x.departureTime ?? ''),
  };
  const hasAny = [leg.airline, leg.flightNumber, leg.pnr, leg.departureTime].some((v) => String(v).trim());
  return hasAny ? leg : undefined;
}

export function normalizeStoredReservationData(raw: unknown): ReservationData {
  if (!raw || typeof raw !== 'object') return { hotels: [] };
  const o = raw as RawStored;

  let outboundFlight = normalizeFlightLeg(o.outboundFlight);
  const returnFlight = normalizeFlightLeg(o.returnFlight);

  if (!outboundFlight && !returnFlight && o.flight) {
    outboundFlight = normalizeFlightLeg(o.flight);
  }

  const hotelsIn = Array.isArray(o.hotels) ? o.hotels : [];
  const hotels: ReservationData['hotels'] = hotelsIn
    .filter((h) => h && typeof h === 'object')
    .map((h) => {
      const x = h as Partial<ReservationData['hotels'][number]>;
      return {
        id: typeof x.id === 'string' && x.id.trim() ? x.id : newHotelId(),
        name: String(x.name ?? ''),
        reservationNumber: String(x.reservationNumber ?? ''),
        checkIn: String(x.checkIn ?? ''),
        checkInTime: String(x.checkInTime ?? ''),
        checkOut: String(x.checkOut ?? ''),
        checkOutTime: String(x.checkOutTime ?? ''),
      };
    });
  return { outboundFlight, returnFlight, hotels };
}

const modalShellClass =
  'flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111118] shadow-xl';

const labelClass = 'mb-1 block text-[12px] font-medium text-white/50';
const inputClass =
  'w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-[#5dcaa5]/50 focus:ring-1 focus:ring-[#5dcaa5]/30';
const timeInputClass = `${inputClass} h-11 min-w-0`;

const flightCardClass =
  'rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4';

type LegKey = 'outboundFlight' | 'returnFlight';

type Props = {
  open: boolean;
  onClose: () => void;
  reservationData: ReservationData;
  onSave: (data: ReservationData) => void;
};

function FlightLegCard({
  title,
  leg,
  onFieldChange,
  headerAction,
}: {
  title: string;
  leg: FlightReservationLeg;
  onFieldChange: (key: keyof FlightReservationLeg, value: string) => void;
  headerAction?: ReactNode;
}) {
  return (
    <div className={flightCardClass}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5dcaa5]">{title}</div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Havayolu</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Türk Hava Yolları"
            value={leg.airline}
            onChange={(e) => onFieldChange('airline', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Uçuş Numarası</label>
          <input
            type="text"
            className={inputClass}
            placeholder="TK1234"
            value={leg.flightNumber}
            onChange={(e) => onFieldChange('flightNumber', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>PNR Numarası</label>
          <input
            type="text"
            className={inputClass}
            placeholder="ABC123"
            value={leg.pnr}
            onChange={(e) => onFieldChange('pnr', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Kalkış Saati</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="örn. 08:45"
            pattern="[0-9]{2}:[0-9]{2}"
            maxLength={5}
            className={timeInputClass}
            style={{ colorScheme: 'dark' }}
            value={leg.departureTime}
            onChange={(e) => onFieldChange('departureTime', formatClockInput(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

function timeFieldOk(s: string): boolean {
  const t = s.trim();
  return t === '' || isValidClockTime(t);
}

export function ReservationModal({ open, onClose, reservationData, onSave }: Props) {
  const [draft, setDraft] = useState<ReservationData>(reservationData);
  const [returnSectionVisible, setReturnSectionVisible] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const clearReturnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearReturnTimeoutRef.current) clearTimeout(clearReturnTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    setDraft({
      outboundFlight: reservationData.outboundFlight
        ? { ...reservationData.outboundFlight }
        : undefined,
      returnFlight: reservationData.returnFlight ? { ...reservationData.returnFlight } : undefined,
      hotels: reservationData.hotels.map((h) => ({ ...h })),
    });
    setReturnSectionVisible(legHasAnyContent(reservationData.returnFlight));
  }, [open, reservationData]);

  const openReturnSection = useCallback(() => {
    if (clearReturnTimeoutRef.current) {
      clearTimeout(clearReturnTimeoutRef.current);
      clearReturnTimeoutRef.current = null;
    }
    setReturnSectionVisible(true);
  }, []);

  const removeReturnSection = useCallback(() => {
    if (clearReturnTimeoutRef.current) clearTimeout(clearReturnTimeoutRef.current);
    setReturnSectionVisible(false);
    clearReturnTimeoutRef.current = setTimeout(() => {
      setDraft((d) => ({ ...d, returnFlight: undefined }));
      clearReturnTimeoutRef.current = null;
    }, RETURN_COLLAPSE_MS);
  }, []);

  const setLegField = (which: LegKey, key: keyof FlightReservationLeg, value: string) => {
    setSaveError(null);
    const current = draft[which] ?? { ...emptyLeg };
    const next: FlightReservationLeg = {
      ...current,
      [key]: key === 'pnr' ? value.toUpperCase() : value,
    };
    const hasAny = Object.values(next).some((v) => String(v).trim());
    setDraft((d) => ({
      ...d,
      [which]: hasAny ? next : undefined,
    }));
  };

  const updateHotel = (
    id: string,
    patch: Partial<ReservationData['hotels'][number]>,
  ) => {
    setSaveError(null);
    setDraft((d) => ({
      ...d,
      hotels: d.hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  };

  const addHotel = () => {
    setDraft((d) => ({
      ...d,
      hotels: [
        ...d.hotels,
        {
          id: newHotelId(),
          name: '',
          reservationNumber: '',
          checkIn: '',
          checkInTime: '',
          checkOut: '',
          checkOutTime: '',
        },
      ],
    }));
  };

  const removeHotel = (id: string) => {
    setDraft((d) => ({ ...d, hotels: d.hotels.filter((h) => h.id !== id) }));
  };

  const handleSave = () => {
    setSaveError(null);
    const outboundClean = draft.outboundFlight;
    const hasOutbound =
      outboundClean && Object.values(outboundClean).some((v) => String(v).trim());
    const returnClean = draft.returnFlight;
    const hasReturn = returnClean && Object.values(returnClean).some((v) => String(v).trim());

    const legsToCheck: FlightReservationLeg[] = [];
    if (hasOutbound && outboundClean) legsToCheck.push(outboundClean);
    if (returnSectionVisible && hasReturn && returnClean) legsToCheck.push(returnClean);
    for (const leg of legsToCheck) {
      if (!timeFieldOk(leg.departureTime)) {
        setSaveError('Uçuş kalkış saatini 00:00–23:59 arasında ss:aa olarak girin veya boş bırakın.');
        return;
      }
    }
    for (const h of draft.hotels) {
      if (!timeFieldOk(h.checkInTime) || !timeFieldOk(h.checkOutTime)) {
        setSaveError('Otel check-in / check-out saatlerini 00:00–23:59 arasında ss:aa olarak girin veya boş bırakın.');
        return;
      }
    }

    onSave({
      outboundFlight: hasOutbound ? outboundClean : undefined,
      returnFlight: returnSectionVisible && hasReturn ? returnClean : undefined,
      hotels: draft.hotels,
    });
    onClose();
  };

  if (!open) return null;

  const outbound = draft.outboundFlight ?? { ...emptyLeg };
  const returnLeg = draft.returnFlight ?? { ...emptyLeg };

  const returnGridClass = returnSectionVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]';
  const returnInnerOpacityClass = returnSectionVisible
    ? 'opacity-100'
    : 'pointer-events-none opacity-0';

  return (
    <div
      className="fixed inset-0 z-[1510] flex items-center justify-center bg-black/60 px-4 pb-4 pt-14 backdrop-blur-[2px] sm:px-6 sm:pb-6 sm:pt-14"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className={modalShellClass}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-modal-title"
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#111118] px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="reservation-modal-title" className="min-w-0 flex-1 pr-2 text-[15px] font-semibold text-white">
            🎫 Rezervasyonlarım
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-xl leading-none text-white/50 transition-colors hover:bg-white/10 hover:text-white/85"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4">
          <section className="mb-6">
            <h3 className="mb-3 text-[13px] font-semibold text-[#5dcaa5]">✈️ Uçuş Bilgileri</h3>
            <div className="flex flex-col gap-3">
            <FlightLegCard
              title="GİDİŞ"
              leg={outbound}
              onFieldChange={(key, value) => setLegField('outboundFlight', key, value)}
            />

            {!returnSectionVisible ? (
              <button
                type="button"
                onClick={openReturnSection}
                className="w-full rounded-xl border border-dashed border-[#1d9e75]/35 bg-[rgba(29,158,117,0.05)] py-3 text-[13px] font-medium text-[#5dcaa5]/90 transition-colors hover:border-[#5dcaa5]/45 hover:bg-[rgba(29,158,117,0.1)] hover:text-[#5dcaa5] active:opacity-90"
              >
                + Dönüş Uçuşu Ekle
              </button>
            ) : null}

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${returnGridClass}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className={`pt-0 transition-opacity duration-300 ease-out ${returnInnerOpacityClass}`}>
                  <FlightLegCard
                    title="DÖNÜŞ"
                    leg={returnLeg}
                    onFieldChange={(key, value) => setLegField('returnFlight', key, value)}
                    headerAction={
                      <button
                        type="button"
                        onClick={removeReturnSection}
                        className="rounded-md px-2 py-1 text-[11px] font-medium text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/85"
                        aria-label="Dönüş uçuşunu kaldır"
                      >
                        ✕ Kaldır
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
            </div>
          </section>

          <section className="mb-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-[#5dcaa5]">🏨 Otel Bilgileri</h3>
            <button
              type="button"
              onClick={addHotel}
              className="rounded-lg border border-white/20 bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:border-[#6366f1]/40 hover:bg-[#6366f1]/10 hover:text-white"
            >
              + Otel Ekle
            </button>
            </div>

            {draft.hotels.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] py-6 text-center text-[12px] text-white/35">
              Henüz otel eklenmedi. «+ Otel Ekle» ile ekleyin.
            </p>
            ) : (
            <div className="space-y-4">
              {draft.hotels.map((h, idx) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-white/35">
                      Otel {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHotel(h.id)}
                      className="text-[11px] text-red-400/90 underline-offset-2 hover:underline"
                    >
                      Kaldır
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Otel Adı</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={h.name}
                        onChange={(e) => updateHotel(h.id, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Rezervasyon Numarası</label>
                      <input
                        type="text"
                        className={inputClass}
                        value={h.reservationNumber}
                        onChange={(e) => updateHotel(h.id, { reservationNumber: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Check-in tarihi</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={h.checkIn}
                          onChange={(e) => updateHotel(h.id, { checkIn: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Check-in saati</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="örn. 15:00"
                          pattern="[0-9]{2}:[0-9]{2}"
                          maxLength={5}
                          className={timeInputClass}
                          style={{ colorScheme: 'dark' }}
                          value={h.checkInTime}
                          onChange={(e) =>
                            updateHotel(h.id, { checkInTime: formatClockInput(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Check-out tarihi</label>
                        <input
                          type="date"
                          className={inputClass}
                          value={h.checkOut}
                          onChange={(e) => updateHotel(h.id, { checkOut: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Check-out saati</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="örn. 11:00"
                          pattern="[0-9]{2}:[0-9]{2}"
                          maxLength={5}
                          className={timeInputClass}
                          style={{ colorScheme: 'dark' }}
                          value={h.checkOutTime}
                          onChange={(e) =>
                            updateHotel(h.id, { checkOutTime: formatClockInput(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 bg-[#111118] px-4 py-3 sm:px-6 sm:py-4">
          {saveError ? (
            <p className="text-center text-[12px] leading-snug text-red-400/95" role="alert">
              {saveError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-[10px] bg-[#1d9e75] py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95 active:opacity-90"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
