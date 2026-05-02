'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEPARTURE_AIRPORT_OPTIONS } from '@/lib/departure-airports';
import type { DepartureIata, PlanRequest, TripPlan } from '@/types';

const STORAGE_KEY = 'gezle-trip';

type HeroSearchProps = {
  onError?: (msg: string) => void;
};

export function HeroSearch({ onError }: HeroSearchProps) {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [departureIata, setDepartureIata] = useState<DepartureIata>('ADB');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [people, setPeople] = useState<PlanRequest['people']>('cift');
  const [tripType, setTripType] = useState<PlanRequest['tripType']>('karma');
  const [budget, setBudget] = useState('');
  const [hasRentalCar, setHasRentalCar] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!destination.trim() || !startDate || !endDate || !budget.trim()) {
      onError?.('Lütfen destinasyon, tarih aralığı ve bütçeyi doldurun.');
      return;
    }
    if (hasTicket && (!arrivalTime || !departureTime)) {
      onError?.('Biletiniz varsa gidiş iniş ve dönüş kalkış saatlerini girin.');
      return;
    }

    const request: PlanRequest = {
      destination: destination.trim(),
      departureIata,
      startDate,
      endDate,
      people,
      tripType,
      budget: budget.trim(),
      hasRentalCar,
      hasTicket,
      ...(hasTicket ? { arrivalTime, departureTime } : {}),
    };

    setLoading(true);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Plan oluşturulamadı');
      }

      const plan = (await res.json()) as TripPlan;
      const payload = JSON.stringify({ plan, request });
      localStorage.setItem(STORAGE_KEY, payload);
      router.push('/plan');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Plan oluşturulamadı, tekrar dene');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-3xl rounded-[12px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5 backdrop-blur-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Nereye?</span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Örn. Kotor, Karadağ"
              className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#1d9e75] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Nereden kalkıyorsunuz?</span>
            <select
              value={departureIata}
              onChange={(e) => setDepartureIata(e.target.value as DepartureIata)}
              className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
            >
              {DEPARTURE_AIRPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0a0a0f]">
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[#5dcaa5]">Başlangıç</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-2 text-[14px] text-white focus:border-[#1d9e75] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] text-[#5dcaa5]">Bitiş</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-2 text-[14px] text-white focus:border-[#1d9e75] focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Kimlerle?</span>
            <select
              value={people}
              onChange={(e) => setPeople(e.target.value as PlanRequest['people'])}
              className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
            >
              <option value="yalniz">Yalnız</option>
              <option value="cift">Çift</option>
              <option value="aile">Aile</option>
              <option value="arkadasgrubu">Arkadaş grubu</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Tatil tipi?</span>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as PlanRequest['tripType'])}
              className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
            >
              <option value="tarih">Tarih</option>
              <option value="deniz">Deniz</option>
              <option value="doga">Doğa</option>
              <option value="karma">Karma</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <span className="text-[12px] text-[#5dcaa5]">Bütçe?</span>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Örn. 50.000 ₺"
              className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#1d9e75] focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 self-end text-[12px] text-white/80">
            <input
              type="checkbox"
              checked={hasRentalCar}
              onChange={(e) => setHasRentalCar(e.target.checked)}
              className="rounded border-white/20 bg-[#0a0a0f]/40 text-[#1d9e75] focus:ring-[#1d9e75]"
            />
            Araç kiralayacağım
          </label>
          <fieldset className="min-w-0 border-0 p-0">
            <legend className="mb-2 text-[12px] text-[#5dcaa5]">Uçak biletiniz var mı?</legend>
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-2 text-[13px] text-white/90">
                <input
                  type="radio"
                  name="flightTicket"
                  checked={hasTicket}
                  onChange={() => {
                    setHasTicket(true);
                  }}
                  className="mt-0.5 border-white/30 bg-[#0a0a0f]/40 text-[#1d9e75] focus:ring-[#1d9e75]"
                />
                <span>✅ Evet, biletim var</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[13px] text-white/90">
                <input
                  type="radio"
                  name="flightTicket"
                  checked={!hasTicket}
                  onChange={() => {
                    setHasTicket(false);
                    setArrivalTime('');
                    setDepartureTime('');
                  }}
                  className="mt-0.5 border-white/30 bg-[#0a0a0f]/40 text-[#1d9e75] focus:ring-[#1d9e75]"
                />
                <span>🔍 Hayır, bakmak istiyorum</span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="mt-3 space-y-3">
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
              hasTicket ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-3 pb-1 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#5dcaa5]">Varış havalimanına iniş saatiniz</span>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    step={60}
                    className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
                  />
                  <span className="text-[11px] text-white/40">örn. 17:00</span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#5dcaa5]">Dönüş havalimanından kalkış saatiniz</span>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    step={60}
                    className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
                  />
                  <span className="text-[11px] text-white/40">örn. 14:00</span>
                </label>
              </div>
            </div>
          </div>
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
              hasTicket ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="rounded-[10px] border border-white/10 bg-[#0a0a0f]/35 p-3 text-[13px] leading-relaxed text-white/85">
                <p className="font-medium text-white/95">🔍 Skyscanner üzerinde uçuş arayacağız.</p>
                <p className="mt-1 text-white/75">
                  Plan oluşturduktan sonra size en uygun uçuşları göstereceğiz.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="h-11 min-w-[140px] rounded-[10px] bg-[#1d9e75] px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Planla →
          </button>
        </div>
      </form>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]/75">
          <div className="flex flex-col items-center gap-4 rounded-[12px] border border-[#e5e7eb] bg-white px-10 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e5e7eb] border-t-[#1d9e75]" />
            <p className="text-[15px] font-medium text-[#0a0a0f]">Planın hazırlanıyor...</p>
          </div>
        </div>
      )}
    </>
  );
}
