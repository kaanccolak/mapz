'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Activity } from '@/types';

type Step = 'pick' | 'place' | 'free';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (activity: Activity) => void;
  /** Örn. gün tarihi / başlık */
  contextLabel?: string;
  /** Text Search için (örn. şehir) */
  tripDestination?: string;
};

function newManualId(): string {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const shellClass =
  'flex max-h-[90dvh] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111118] shadow-[0_20px_60px_rgba(0,0,0,0.55)]';

const labelClass = 'mb-1.5 block text-[12px] font-medium text-white/55';
const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-[#1d9e75]/50';

export function AddManualActivityModal({
  open,
  onClose,
  onSubmit,
  contextLabel,
  tripDestination = '',
}: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [mapsUrl, setMapsUrl] = useState('');
  const [timePlace, setTimePlace] = useState('12:00');
  const [timeFree, setTimeFree] = useState('12:00');
  const [nameFree, setNameFree] = useState('');
  const [descFree, setDescFree] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setMapsUrl('');
    setTimePlace('12:00');
    setTimeFree('12:00');
    setNameFree('');
    setDescFree('');
    setPlaceError(null);
    setPlaceLoading(false);
  }, [open]);

  const baseActivity = useCallback(
    (partial: Pick<Activity, 'name' | 'description' | 'lat' | 'lng'>): Activity => ({
      id: newManualId(),
      time: '',
      type: 'custom',
      duration: '',
      isManual: true,
      name: partial.name,
      description: partial.description ?? '',
      ...(partial.lat != null && partial.lng != null ? { lat: partial.lat, lng: partial.lng } : {}),
    }),
    [],
  );

  const handleAddPlace = useCallback(async () => {
    setPlaceError(null);
    const url = mapsUrl.trim();
    if (!url) {
      setPlaceError('Harita bağlantısı girin.');
      return;
    }
    setPlaceLoading(true);
    try {
      const res = await fetch('/api/places/extract-from-maps-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, destination: tripDestination.trim() || undefined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        name?: string;
        lat?: number;
        lng?: number;
        error?: string;
      };
      if (!res.ok || !data.ok || data.name == null || data.lat == null || data.lng == null) {
        setPlaceError(data.error ?? 'Mekan bulunamadı');
        return;
      }
      const act = baseActivity({
        name: data.name,
        description: '',
        lat: data.lat,
        lng: data.lng,
      });
      act.time = timePlace.trim() || '12:00';
      onSubmit(act);
      onClose();
    } catch {
      setPlaceError('Mekan bulunamadı');
    } finally {
      setPlaceLoading(false);
    }
  }, [mapsUrl, timePlace, tripDestination, baseActivity, onSubmit, onClose]);

  const handleAddFree = useCallback(() => {
    const name = nameFree.trim();
    if (!name) return;
    const act = baseActivity({
      name,
      description: descFree.trim(),
    });
    act.time = timeFree.trim() || '12:00';
    onSubmit(act);
    onClose();
  }, [nameFree, descFree, timeFree, baseActivity, onSubmit, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1510] flex items-end justify-center bg-black/65 px-3 pb-4 pt-14 backdrop-blur-[2px] sm:items-center sm:p-6 sm:pt-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div className={shellClass} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-[15px] font-semibold text-white">
            Aktivite ekle
            {contextLabel ? (
              <span className="mt-0.5 block text-[11px] font-normal text-white/40">{contextLabel}</span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {step === 'pick' ? (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-white/70">Ne eklemek istiyorsunuz?</p>
              <button
                type="button"
                onClick={() => setStep('place')}
                className="flex w-full items-start gap-3 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-left transition hover:border-[#1d9e75]/40 hover:bg-white/[0.08]"
              >
                <span className="text-xl" aria-hidden>
                  📍
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-white">Mekan</span>
                  <span className="mt-0.5 block text-[12px] text-white/45">Google Maps linki gerekli</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStep('free')}
                className="flex w-full items-start gap-3 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 text-left transition hover:border-[#1d9e75]/40 hover:bg-white/[0.08]"
              >
                <span className="text-xl" aria-hidden>
                  🚗
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-white">Aktivite</span>
                  <span className="mt-0.5 block text-[12px] text-white/45">Serbest metin · haritada pin yok</span>
                </span>
              </button>
            </div>
          ) : null}

          {step === 'place' ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="w-fit text-[12px] font-medium text-[#5dcaa5] hover:underline"
              >
                ← Geri
              </button>
              <div>
                <label className={labelClass} htmlFor="manual-maps-url">
                  Google Maps linki
                </label>
                <input
                  id="manual-maps-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://maps.google.com/... veya https://goo.gl/maps/..."
                  className={inputClass}
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="manual-place-time">
                  Saat
                </label>
                <input
                  id="manual-place-time"
                  type="time"
                  className={inputClass}
                  value={timePlace}
                  onChange={(e) => setTimePlace(e.target.value)}
                />
              </div>
              {placeError ? (
                <p className="text-[12px] text-red-400" role="alert">
                  {placeError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={placeLoading}
                onClick={() => void handleAddPlace()}
                className="w-full rounded-xl bg-[#1d9e75] py-3 text-[14px] font-semibold text-white transition hover:bg-[#178f68] disabled:opacity-50"
              >
                {placeLoading ? 'Yükleniyor…' : 'Ekle'}
              </button>
            </div>
          ) : null}

          {step === 'free' ? (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setStep('pick')}
                className="w-fit text-[12px] font-medium text-[#5dcaa5] hover:underline"
              >
                ← Geri
              </button>
              <div>
                <label className={labelClass} htmlFor="manual-free-name">
                  Aktivite adı
                </label>
                <input
                  id="manual-free-name"
                  type="text"
                  className={inputClass}
                  value={nameFree}
                  onChange={(e) => setNameFree(e.target.value)}
                  placeholder="Örn. Otele transfer"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="manual-free-desc">
                  Açıklama <span className="text-white/35">(opsiyonel)</span>
                </label>
                <textarea
                  id="manual-free-desc"
                  rows={3}
                  className={`${inputClass} resize-none`}
                  value={descFree}
                  onChange={(e) => setDescFree(e.target.value)}
                  placeholder="Notlarınız…"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="manual-free-time">
                  Saat
                </label>
                <input
                  id="manual-free-time"
                  type="time"
                  className={inputClass}
                  value={timeFree}
                  onChange={(e) => setTimeFree(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleAddFree}
                disabled={!nameFree.trim()}
                className="w-full rounded-xl bg-[#1d9e75] py-3 text-[14px] font-semibold text-white transition hover:bg-[#178f68] disabled:opacity-50"
              >
                Ekle
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
