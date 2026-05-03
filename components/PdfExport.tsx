'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef, useState } from 'react';
import type { FlightReservationLeg, ReservationData } from '@/components/ReservationModal';
import type { Activity, PlanRequest, TripPlan } from '@/types';

const peopleLabels: Record<PlanRequest['people'], string> = {
  yalniz: 'Yalnız',
  cift: 'Çift',
  aile: 'Aile',
  arkadasgrubu: 'Arkadaş grubu',
};

export type PdfExpenses = {
  ucak: string;
  konaklama: string;
  aracKiralama: string;
  yemeIcme: string;
  alisveris: string;
  diger: string;
};

interface PdfExportProps {
  plan: TripPlan;
  request: PlanRequest;
  expenses: PdfExpenses;
  reservationData?: ReservationData;
  /** Paylaşım linki için (Firestore kaydı sonrası). Yoksa "Planı Paylaş" devre dışı. */
  shareId?: string | null;
  /** Örn. https://mapz-kappa.vercel.app — sonda / olmadan */
  shareBaseUrl?: string;
  /** Dar sidebar için küçük buton */
  compact?: boolean;
  /** true: paylaşım butonu gösterilmez (salt PDF) */
  hideShare?: boolean;
}

/** İndirilen PDF dosya adı: örn. "Karadağ Planı" (başlığın ilk kelimesi veya destinasyon). */
function buildPdfDownloadBaseName(plan: TripPlan, request: PlanRequest): string {
  const title = plan.tripTitle?.trim();
  if (title) {
    const first = title.split(/\s+/)[0]?.trim();
    if (first) return `${first} Planı`;
  }
  const dest = request.destination.trim().split(/[,;]/)[0]?.trim() || 'Gezle';
  return `${dest} Planı`;
}

function sanitizePdfFileName(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.replace(/^\.+|\.+$/g, '') || 'Gezle Plani';
}

function flightLegHasPdfContent(f?: FlightReservationLeg): boolean {
  if (!f) return false;
  return [f.airline, f.flightNumber, f.pnr, f.departureTime].some((x) => String(x).trim());
}

function hotelHasPdfContent(h: ReservationData['hotels'][number]): boolean {
  return [h.name, h.reservationNumber, h.checkIn, h.checkInTime, h.checkOut, h.checkOutTime].some((x) =>
    String(x).trim(),
  );
}

function formatPdfDate(isoDate: string): string {
  const s = String(isoDate).trim();
  if (!s) return '—';
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPdfTime(t: string): string {
  const s = String(t).trim();
  return s || '—';
}

function reservationHasPdfContent(data: ReservationData | undefined): boolean {
  if (!data) return false;
  if (flightLegHasPdfContent(data.outboundFlight)) return true;
  if (flightLegHasPdfContent(data.returnFlight)) return true;
  return data.hotels.some(hotelHasPdfContent);
}

function pdfFlightLegBlock(leg: FlightReservationLeg, heading: string) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#374151',
          marginBottom: 6,
          letterSpacing: '0.02em',
        }}
      >
        {heading}
      </div>
      <div style={{ fontSize: 13, color: '#1f2937', marginBottom: 4, lineHeight: 1.5 }}>
        {[leg.airline, leg.flightNumber]
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' ')}
        {String(leg.pnr).trim() ? ` | PNR: ${String(leg.pnr).trim()}` : ''}
      </div>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Kalkış: {formatPdfTime(leg.departureTime)}</div>
    </div>
  );
}

const DEFAULT_SHARE_BASE = 'https://mapz-kappa.vercel.app';

export default function PdfExport({
  plan,
  request,
  expenses,
  reservationData,
  shareId,
  shareBaseUrl,
  compact,
  hideShare = false,
}: PdfExportProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const baseShare = (process.env.NEXT_PUBLIC_APP_URL || shareBaseUrl || DEFAULT_SHARE_BASE).replace(/\/$/, '');

  const copyShareLink = async () => {
    if (!shareId?.trim()) return;
    const url = `${baseShare}/plan/${encodeURIComponent(shareId.trim())}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Bu linki kopyalayın:', url);
    }
  };

  const exportPdf = async () => {
    if (!contentRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const baseName = buildPdfDownloadBaseName(plan, request);
      pdf.save(`${sanitizePdfFileName(baseName)}.pdf`);
    } catch (err) {
      console.error('PDF hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const tripTitle = plan.tripTitle || request.destination;
  const budgetNum = Number(String(request.budget).replace(/\D/g, ''));
  const budgetDisplay = Number.isFinite(budgetNum) && budgetNum > 0
    ? `${budgetNum.toLocaleString('tr-TR')} ₺`
    : `${request.budget} ₺`;

  const btnPrimary = {
    padding: compact ? '9px 14px' : '12px 22px',
    background: copied ? '#15805d' : '#1d9e75',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: compact ? 12 : 14,
    fontWeight: 600,
    letterSpacing: compact ? '0.01em' : '0.02em',
    cursor: shareId?.trim() ? 'pointer' : 'not-allowed',
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? 7 : 8,
    whiteSpace: 'nowrap' as const,
    textAlign: 'center' as const,
    lineHeight: 1.25,
    minHeight: compact ? 40 : 44,
    opacity: shareId?.trim() ? 1 : 0.45,
  };

  const showShare = !hideShare;

  const btnSecondary = {
    padding: compact ? '6px 12px' : '8px 16px',
    background: 'transparent',
    color: '#1d9e75',
    border: '1px solid rgba(29,158,117,0.45)',
    borderRadius: 10,
    fontSize: compact ? 11 : 13,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    whiteSpace: 'nowrap' as const,
    minHeight: compact ? 32 : 36,
    opacity: loading ? 0.6 : 1,
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          gap: compact ? 6 : 10,
        }}
      >
        {showShare ? (
          <button
            type="button"
            onClick={() => void copyShareLink()}
            disabled={!shareId?.trim()}
            title={!shareId?.trim() ? 'Önce planı kaydedin' : 'Paylaşım linkini kopyala'}
            style={btnPrimary}
          >
            {copied ? 'Kopyalandı ✓' : '📄 Planı Paylaş'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void exportPdf()}
          disabled={loading}
          style={btnSecondary}
        >
          {loading ? (compact ? '⏳…' : '⏳ PDF…') : '📥 PDF Olarak İndir'}
        </button>
      </div>

      <div
        ref={contentRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          background: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          color: '#1a1a1a',
        }}
        aria-hidden
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a2a1f 100%)',
            padding: '40px 40px 32px',
            marginBottom: '0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d9e75' }}
            />
            <span
              style={{
                color: '#5dcaa5',
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Seyahat Planı
            </span>
          </div>
          <h1
            style={{
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 700,
              margin: '0 0 10px 0',
              lineHeight: 1.3,
            }}
          >
            {tripTitle}
          </h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { icon: '📅', text: `${request.startDate} – ${request.endDate}` },
              { icon: '👥', text: peopleLabels[request.people] },
              { icon: '💰', text: budgetDisplay },
            ].map((item, i) => (
              <span key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                {item.icon} {item.text}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: 4, background: '#1d9e75' }} />

        <div style={{ padding: '32px 40px' }}>
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1d9e75',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 12px 0',
              }}
            >
              Konaklama Planı
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {plan.hotelSuggestions.map((h, i) => (
                <div
                  key={`${h.city}-${h.nights}-${i}`}
                  style={{
                    padding: '12px 16px',
                    background: '#f8fffe',
                    border: '1px solid #d1fae5',
                    borderLeft: '4px solid #1d9e75',
                    borderRadius: 8,
                    minWidth: 160,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{h.city}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{h.nights} gece</div>
                </div>
              ))}
            </div>
          </div>

          {plan.days.map((day, di) => (
            <div key={`${day.date}-${day.dayNumber}-${di}`} style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: '2px solid #f3f4f6',
                }}
              >
                <div
                  style={{
                    background: '#1d9e75',
                    color: 'white',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    alignSelf: 'center',
                  }}
                >
                  {day.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{day.title}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>📍 {day.city}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 16px',
                }}
              >
                {day.activities.map((a: Activity, ai: number) => (
                  <div
                    key={`${day.dayNumber}-${ai}-${a.name}`}
                    style={{
                      display: 'flex',
                      gap: 8,
                      padding: '6px 8px',
                      background: ai % 2 === 0 ? '#fafafa' : '#ffffff',
                      borderRadius: 6,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        color: '#1d9e75',
                        fontWeight: 700,
                        fontSize: 11,
                        minWidth: 16,
                        marginTop: 1,
                      }}
                    >
                      {ai + 1}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 38 }}>{a.time || ''}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.name}</div>
                      <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 1 }}>{a.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginTop: 16,
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1d9e75', margin: '0 0 12px 0' }}>
              Tahmini Harcama Özeti
            </h2>
            {(
              [
                { label: '✈️ Uçak Bileti', value: expenses.ucak },
                { label: '🏨 Konaklama', value: expenses.konaklama },
                { label: '🚗 Araç Kiralama', value: expenses.aracKiralama },
                { label: '🍽️ Yeme-İçme', value: expenses.yemeIcme },
                { label: '🛍️ Alışveriş', value: expenses.alisveris },
                { label: '🎯 Diğer', value: expenses.diger },
              ] as const
            )
              .filter((item) => item.value)
              .map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: 13 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {new Intl.NumberFormat('tr-TR').format(Number(item.value))} ₺
                  </span>
                </div>
              ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Toplam</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1d9e75' }}>
                {new Intl.NumberFormat('tr-TR').format(
                  [
                    expenses.ucak,
                    expenses.konaklama,
                    expenses.aracKiralama,
                    expenses.yemeIcme,
                    expenses.alisveris,
                    expenses.diger,
                  ]
                    .map((v) => Number(v) || 0)
                    .reduce((a, b) => a + b, 0),
                )}{' '}
                ₺
              </span>
            </div>
          </div>

          {reservationHasPdfContent(reservationData) ? (
            <div
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginTop: 16,
              }}
            >
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1d9e75', margin: '0 0 12px 0' }}>
                Rezervasyon Bilgilerim
              </h2>

              {(() => {
                const out = reservationData?.outboundFlight;
                if (!out || !flightLegHasPdfContent(out)) return null;
                return pdfFlightLegBlock(out, '✈️ GİDİŞ UÇUŞU');
              })()}
              {(() => {
                const ret = reservationData?.returnFlight;
                if (!ret || !flightLegHasPdfContent(ret)) return null;
                return pdfFlightLegBlock(ret, '✈️ DÖNÜŞ UÇUŞU');
              })()}

              {(reservationData?.hotels ?? []).filter(hotelHasPdfContent).map((h, hi, arr) => (
                <div
                  key={h.id}
                  style={{
                    marginBottom: hi < arr.length - 1 ? 14 : 0,
                    paddingBottom: hi < arr.length - 1 ? 14 : 0,
                    borderBottom: hi < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    🏨 {String(h.name).trim() || 'Otel'}
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
                    Rezervasyon No: {String(h.reservationNumber).trim() || '—'}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                    Check-in: {formatPdfDate(h.checkIn)} {formatPdfTime(h.checkInTime)} | Check-out:{' '}
                    {formatPdfDate(h.checkOut)} {formatPdfTime(h.checkOutTime)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
