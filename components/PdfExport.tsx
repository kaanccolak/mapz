'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef, useState } from 'react';
import type { Activity, PlanRequest, TripPlan } from '@/types';

const peopleLabels: Record<PlanRequest['people'], string> = {
  yalniz: 'Yalnız',
  cift: 'Çift',
  aile: 'Aile',
  arkadasgrubu: 'Arkadaş grubu',
};

const budgetLabels: Record<string, string> = {
  ucak: '✈️ Uçak Bileti',
  konaklama: '🏨 Konaklama',
  aracKiralama: '🚗 Araç Kiralama',
  yemeIcme: '🍽️ Yeme-İçme',
  gezmeAktivite: '🎯 Gezme & Aktivite',
  alisveris: '🛍️ Alışveriş',
};

interface PdfExportProps {
  plan: TripPlan;
  request: PlanRequest;
}

export default function PdfExport({ plan, request }: PdfExportProps) {
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
      const fileTitle = (plan.tripTitle || request.destination).replace(/[\s&]/g, '_');
      pdf.save(`${fileTitle}.pdf`);
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

  return (
    <>
      <button
        type="button"
        onClick={() => void exportPdf()}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: loading ? 'rgba(255,255,255,0.1)' : '#1d9e75',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {loading ? '⏳ PDF hazırlanıyor...' : '📄 PDF İndir'}
      </button>

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
              marginTop: 8,
              padding: '20px 24px',
              background: '#f8fffe',
              border: '1px solid #d1fae5',
              borderRadius: 12,
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1d9e75',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 14px 0',
              }}
            >
              Tahmini Bütçe Özeti
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 24px',
              }}
            >
              {Object.entries(plan.budgetBreakdown)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{budgetLabels[k] || k}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
