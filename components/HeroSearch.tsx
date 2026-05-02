'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DEPARTURE_AIRPORT_OPTIONS } from '@/lib/departure-airports';
import { searchDestinations, type Airport, type Destination } from '@/lib/destinations';
import type { DepartureIata, PlanRequest } from '@/types';

const PLAN_REQUEST_KEY = 'planRequest';

type HeroSearchProps = {
  onError?: (msg: string) => void;
};

export function HeroSearch({ onError }: HeroSearchProps) {
  const router = useRouter();
  const destWrapRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Destination | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [arrivalAirportOptions, setArrivalAirportOptions] = useState<Airport[]>([]);
  const [destinationArrivalIata, setDestinationArrivalIata] = useState('');

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

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!destWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    setSelectedCountry(null);
    setSelectedCity('');
    setArrivalAirportOptions([]);
    setDestinationArrivalIata('');
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const results = searchDestinations(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  function handleOptionalCityChange(value: string) {
    setSelectedCity(value);
    if (!selectedCountry?.cities?.length) return;
    if (!value) {
      setArrivalAirportOptions(selectedCountry.airports);
      const first = selectedCountry.airports[0];
      setDestinationArrivalIata(first?.code ? first.code.toUpperCase() : '');
      setDestination(selectedCountry.name);
      return;
    }
    const city = selectedCountry.cities.find((c) => c.nameTr === value);
    if (city) {
      setArrivalAirportOptions(city.airports);
      const cf = city.airports[0];
      setDestinationArrivalIata(cf?.code ? cf.code.toUpperCase() : '');
      setDestination(city.name);
    }
  }

  function pickDestination(d: Destination) {
    setShowSuggestions(false);
    setSuggestions([]);
    if (d.isCountry) {
      setSelectedCountry(d);
      setSelectedCity('');
      setDestination(d.name);
      setArrivalAirportOptions(d.airports);
      const first = d.airports[0];
      setDestinationArrivalIata(first?.code ? first.code.toUpperCase() : '');
      return;
    }
    setSelectedCountry(null);
    setSelectedCity('');
    setDestination(d.name);
    setArrivalAirportOptions(d.airports);
    const first = d.airports[0];
    setDestinationArrivalIata(first?.code ? first.code.toUpperCase() : '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let destPayload = destination.trim();
    if (selectedCountry?.isCountry) {
      if (selectedCity.trim()) {
        const city = selectedCountry.cities?.find((c) => c.nameTr === selectedCity.trim());
        destPayload = (city?.name ?? selectedCountry.name).trim();
      } else {
        destPayload = selectedCountry.name.trim();
      }
    }
    if (!destPayload || !startDate || !endDate || !budget.trim()) {
      onError?.('Lütfen destinasyon, tarih aralığı ve bütçeyi doldurun.');
      return;
    }
    if (hasTicket && (!arrivalTime || !departureTime)) {
      onError?.('Biletiniz varsa gidiş iniş ve dönüş kalkış saatlerini girin.');
      return;
    }

    const destAir =
      destinationArrivalIata.trim().length === 3 && /^[A-Z]{3}$/i.test(destinationArrivalIata.trim())
        ? destinationArrivalIata.trim().toUpperCase()
        : undefined;

    const request: PlanRequest = {
      destination: destPayload,
      departureIata,
      startDate,
      endDate,
      people,
      tripType,
      budget: budget.trim(),
      hasRentalCar,
      hasTicket,
      ...(hasTicket ? { arrivalTime, departureTime } : {}),
      ...(destAir ? { destinationAirportIata: destAir } : {}),
    };

    try {
      localStorage.setItem(PLAN_REQUEST_KEY, JSON.stringify(request));
    } catch {
      onError?.('Tarayıcı depolamasına yazılamadı. Tekrar deneyin.');
      return;
    }
    router.push('/plan');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl rounded-[12px] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5 backdrop-blur-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div ref={destWrapRef} className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5dcaa5]">Nereye?</span>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Şehir yazın…"
              autoComplete="off"
              className="h-11 w-full rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#1d9e75] focus:outline-none"
            />
            {showSuggestions && suggestions.length > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#1a1a2e',
                  border: '0.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  marginTop: '4px',
                  zIndex: 100,
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}
                aria-label="Şehir önerileri"
              >
                {suggestions.map((s, i) => (
                  <div
                    key={s.isCountry ? `co-${s.country}-${i}` : `ci-${s.name}-${s.country}`}
                    role="button"
                    tabIndex={0}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      pickDestination(s);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        pickDestination(s);
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom:
                        i < suggestions.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {s.isCountry ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🌍</span>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{s.nameTr}</span>
                          <span style={{ fontSize: 11, color: '#5dcaa5', marginLeft: 8 }}>Tüm ülke</span>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          {s.cities?.length ?? 0} şehir
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{s.nameTr}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.country}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {selectedCountry?.isCountry ? (
            <div style={{ marginTop: 8 }}>
              <label className="block text-[12px] text-white/50">Şehir (isteğe bağlı)</label>
              <select
                value={selectedCity}
                onChange={(e) => handleOptionalCityChange(e.target.value)}
                className="mt-1 h-11 w-full rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
              >
                <option value="">Şehir seçin (isteğe bağlı)</option>
                {selectedCountry.cities?.map((city) => (
                  <option key={city.name} value={city.nameTr} className="bg-[#0a0a0f]">
                    {city.nameTr}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
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
                  setArrivalAirportOptions([]);
                  setDestinationArrivalIata('');
                  setSelectedCountry(null);
                  setSelectedCity('');
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
            {hasTicket ? (
              <div className="grid gap-3 pb-1">
                <div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-[#5dcaa5]">Varış havalimanı</span>
                    <select
                      value={destinationArrivalIata}
                      onChange={(e) => setDestinationArrivalIata(e.target.value)}
                      className="h-11 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
                    >
                      <option value="" className="bg-[#0a0a0f]">
                        Havalimanı seçin
                      </option>
                      {arrivalAirportOptions.map((ap) => (
                        <option key={ap.code} value={ap.code} className="bg-[#0a0a0f]">
                          {ap.name} ({ap.code})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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
            ) : null}
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
          className="h-11 min-w-[140px] rounded-[10px] bg-[#1d9e75] px-6 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Planla →
        </button>
      </div>
    </form>
  );
}
