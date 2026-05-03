'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { AuthModal } from '@/components/AuthModal';
import { ALLOWED_DEPARTURE_IATA } from '@/lib/departure-airports';
import { searchDestinations, type Airport, type Destination } from '@/lib/destinations';
import {
  getGezleQueryCount,
  LONG_TRIP_LOGIN_MESSAGE,
  MAX_TRIAL_PLANS,
  TRIAL_LIMIT_DESCRIPTION,
  TRIAL_LIMIT_TITLE,
} from '@/lib/gezleLimits';
import { nightsBetween } from '@/lib/planDisplayMeta';
import { useAuth } from '@/lib/AuthContext';
import { mergeGroupDetails, type BudgetIncludes, type DepartureIata, type PlanRequest } from '@/types';

const PLAN_REQUEST_KEY = 'planRequest';

const stepBtnClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.08] text-lg font-medium text-white/90 transition hover:bg-white/12 active:scale-95';

function NumberStepRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] text-white/50">{label}</span>
      <div className="flex h-11 min-w-0 items-stretch gap-2 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-1.5">
        <button
          type="button"
          className={stepBtnClass}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label="Azalt"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isNaN(n)) onChange(min);
            else onChange(Math.min(max, Math.max(min, n)));
          }}
          className="min-w-0 flex-1 bg-transparent text-center text-[15px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={stepBtnClass}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label="Arttır"
        >
          +
        </button>
      </div>
    </div>
  );
}

const DEPARTURE_AIRPORTS: { code: DepartureIata; name: string }[] = [
  { code: 'IST', name: 'İstanbul (IST) — Atatürk' },
  { code: 'SAW', name: 'İstanbul (SAW) — Sabiha Gökçen' },
  { code: 'ADB', name: 'İzmir (ADB) — Adnan Menderes' },
  { code: 'ESB', name: 'Ankara (ESB) — Esenboğa' },
  { code: 'AYT', name: 'Antalya (AYT)' },
  { code: 'COV', name: 'Adana (COV) — Çukurova Uluslararası' },
  { code: 'TZX', name: 'Trabzon (TZX)' },
  { code: 'BJV', name: 'Bodrum (BJV) — Milas' },
  { code: 'DLM', name: 'Dalaman (DLM)' },
  { code: 'GZT', name: 'Gaziantep (GZT) — Oğuzeli' },
  { code: 'ASR', name: 'Kayseri (ASR) — Erkilet' },
  { code: 'NAV', name: 'Nevşehir (NAV) — Kapadokya' },
  { code: 'KYA', name: 'Konya (KYA)' },
  { code: 'MLX', name: 'Malatya (MLX) — Erhac' },
  { code: 'ERZ', name: 'Erzurum (ERZ)' },
  { code: 'DIY', name: 'Diyarbakır (DIY)' },
  { code: 'VAN', name: 'Van (VAN) — Ferit Melen' },
  { code: 'SZF', name: 'Samsun (SZF) — Çarşamba' },
  { code: 'VAS', name: 'Sivas (VAS)' },
  { code: 'KSY', name: 'Kars (KSY)' },
  { code: 'ERC', name: 'Erzincan (ERC)' },
  { code: 'MQM', name: 'Mardin (MQM)' },
  { code: 'BAL', name: 'Batman (BAL)' },
  { code: 'IGD', name: 'Iğdır (IGD)' },
  { code: 'MSR', name: 'Muş (MSR)' },
  { code: 'SFQ', name: 'Şanlıurfa (SFQ) — GAP' },
  { code: 'KCM', name: 'Kahramanmaraş (KCM)' },
  { code: 'ISE', name: 'Isparta (ISE) — Süleyman Demirel' },
  { code: 'USQ', name: 'Uşak (USQ)' },
  { code: 'KZR', name: 'Kütahya (KZR) — Zafer' },
  { code: 'BZI', name: 'Balıkesir (BZI) — Merkez' },
  { code: 'EDO', name: 'Balıkesir (EDO) — Edremit' },
  { code: 'CKZ', name: 'Çanakkale (CKZ)' },
  { code: 'TEQ', name: 'Tekirdağ (TEQ) — Çorlu' },
  { code: 'AOE', name: 'Eskişehir (AOE)' },
  { code: 'AFY', name: 'Afyonkarahisar (AFY)' },
  { code: 'ADF', name: 'Adıyaman (ADF)' },
  { code: 'TJK', name: 'Tokat (TJK)' },
  { code: 'MZH', name: 'Amasya (MZH) — Merzifon' },
  { code: 'KFS', name: 'Kastamonu (KFS)' },
  { code: 'ONQ', name: 'Zonguldak (ONQ)' },
  { code: 'BOL', name: 'Bolu (BOL) — Dursunbey' },
  { code: 'GNY', name: 'Şanlıurfa (GNY) — Güneydoğu Anadolu' },
  { code: 'AJI', name: 'Ağrı (AJI)' },
  { code: 'HTY', name: 'Hatay (HTY)' },
  { code: 'GKD', name: 'Gökçeada (GKD)' },
  { code: 'BXN', name: 'Bodrum (BXN) — İmsık' },
  { code: 'YEI', name: 'Bursa (YEI) — Yenişehir' },
  { code: 'OGU', name: 'Ordu (OGU) — Giresun' },
  { code: 'SIC', name: 'Sinop (SIC)' },
  { code: 'RTE', name: 'Rize (RTE) — Artvin' },
  { code: 'RZV', name: 'Rize-Artvin (RZV)' },
  { code: 'NOP', name: 'Sinop (NOP)' },
  { code: 'GZP', name: 'Alanya (GZP) — Gazipaşa' },
  { code: 'TEV', name: 'Denizli (TEV) — Çardak' },
];

const normalize = (str: string) =>
  str
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i');

const PICKER_INPUT_STYLE: CSSProperties = {
  width: '100%',
  minWidth: 0,
  minHeight: 44,
  height: 44,
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.15)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '14px',
  colorScheme: 'dark',
  cursor: 'pointer',
};

function openPickerOnClick(e: ReactMouseEvent<HTMLInputElement>) {
  void (e.target as HTMLInputElement).showPicker?.();
}

type HeroSearchProps = {
  onError?: (msg: string) => void;
};

export function HeroSearch({ onError }: HeroSearchProps) {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const destWrapRef = useRef<HTMLDivElement>(null);
  const departureWrapRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Destination | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [arrivalAirportOptions, setArrivalAirportOptions] = useState<Airport[]>([]);
  const [destinationArrivalIata, setDestinationArrivalIata] = useState('');

  const [departureIata, setDepartureIata] = useState<DepartureIata | ''>('');
  const [departureSearch, setDepartureSearch] = useState('');
  const [departureSuggestions, setDepartureSuggestions] = useState<(typeof DEPARTURE_AIRPORTS)[number][]>(
    [],
  );
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [people, setPeople] = useState<PlanRequest['people']>('cift');
  const prevPeopleRef = useRef<PlanRequest['people']>('cift');
  const [familyAdults, setFamilyAdults] = useState(2);
  const [familyChildren, setFamilyChildren] = useState(0);
  const [familyChildAges, setFamilyChildAges] = useState<number[]>([]);
  const [familyRooms, setFamilyRooms] = useState(1);
  const [friendsCount, setFriendsCount] = useState(2);
  const [friendsRooms, setFriendsRooms] = useState(1);
  const [tripType, setTripType] = useState<PlanRequest['tripType']>('karma');
  const [budget, setBudget] = useState('');
  const [budgetDisplay, setBudgetDisplay] = useState('');
  const [budgetIncludes, setBudgetIncludes] = useState<BudgetIncludes>({
    flight: false,
    car: false,
    hotel: true,
    food: true,
    activities: true,
  });
  const [hasRentalCar, setHasRentalCar] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');

  const [trialLimitOpen, setTrialLimitOpen] = useState(false);
  const [longTripPromptOpen, setLongTripPromptOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const minStartDate = new Date().toISOString().split('T')[0];
  const minEndDate = startDate
    ? new Date(new Date(startDate).getTime() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const checkLongTripForDates = useCallback(
    (sd: string, ed: string) => {
      if (authLoading) return;
      if (currentUser) {
        setLongTripPromptOpen(false);
        return;
      }
      if (!sd?.trim() || !ed?.trim()) {
        setLongTripPromptOpen(false);
        return;
      }
      setLongTripPromptOpen(nightsBetween(sd, ed) > 4);
    },
    [authLoading, currentUser],
  );

  useEffect(() => {
    checkLongTripForDates(startDate, endDate);
  }, [startDate, endDate, authLoading, currentUser, checkLongTripForDates]);

  const handleBudgetChange = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');

    setBudget(numbers);

    if (numbers === '') {
      setBudgetDisplay('');
      return;
    }

    const formatted = new Intl.NumberFormat('tr-TR').format(Number(numbers));
    setBudgetDisplay(formatted + ' ₺');
  };

  useEffect(() => {
    if (people === 'aile' && prevPeopleRef.current !== 'aile') {
      setFamilyAdults(2);
      setFamilyChildren(0);
      setFamilyChildAges([]);
      setFamilyRooms(1);
    }
    if (people === 'arkadasgrubu' && prevPeopleRef.current !== 'arkadasgrubu') {
      setFriendsCount(2);
      setFriendsRooms(1);
    }
    prevPeopleRef.current = people;
  }, [people]);

  const setFamilyChildrenCount = (next: number) => {
    const c = Math.min(6, Math.max(0, next));
    setFamilyChildren(c);
    setFamilyChildAges((prev) => {
      const arr = prev.slice(0, c);
      while (arr.length < c) arr.push(8);
      return arr;
    });
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!destWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (!departureWrapRef.current?.contains(e.target as Node)) {
        setShowDepartureSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleDepartureSearch = (value: string) => {
    setDepartureSearch(value);
    setDepartureIata('');
    if (value.length < 1) {
      setDepartureSuggestions([]);
      setShowDepartureSuggestions(false);
      return;
    }
    const q = normalize(value);
    const results = DEPARTURE_AIRPORTS.filter(
      (a) => normalize(a.name).includes(q) || a.code.toLowerCase().includes(q),
    ).slice(0, 6);
    setDepartureSuggestions(results);
    setShowDepartureSuggestions(true);
  };

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
    const dep = departureIata.trim().toUpperCase();
    if (!dep || !ALLOWED_DEPARTURE_IATA.includes(dep as DepartureIata)) {
      onError?.('Lütfen kalkış şehri seçin.');
      return;
    }
    if (hasTicket && (!arrivalTime || !departureTime)) {
      onError?.('Biletiniz varsa gidiş iniş ve dönüş kalkış saatlerini girin.');
      return;
    }

    if (getGezleQueryCount() >= MAX_TRIAL_PLANS) {
      setTrialLimitOpen(true);
      return;
    }

    const tripNights = nightsBetween(startDate, endDate);
    if (!authLoading && !currentUser && tripNights > 4) {
      setLongTripPromptOpen(true);
      return;
    }

    const destAir =
      destinationArrivalIata.trim().length === 3 && /^[A-Z]{3}$/i.test(destinationArrivalIata.trim())
        ? destinationArrivalIata.trim().toUpperCase()
        : undefined;

    const groupPartial =
      people === 'aile'
        ? {
            adults: familyAdults,
            children: familyChildren,
            rooms: familyRooms,
            childAges: familyChildAges.slice(0, familyChildren),
          }
        : people === 'arkadasgrubu'
          ? { adults: friendsCount, rooms: friendsRooms }
          : undefined;

    const request: PlanRequest = {
      destination: destPayload,
      departureIata: dep as DepartureIata,
      startDate,
      endDate,
      people,
      groupDetails: mergeGroupDetails(people, groupPartial),
      tripType,
      budget: budget.trim(),
      budgetIncludes,
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

  const modalOverlayClass =
    'fixed inset-0 z-[2000] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]';
  const modalPanelClass =
    'max-h-[90vh] w-full max-w-[min(calc(100vw-2rem),420px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-xl';

  return (
    <>
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
              className="h-11 w-full rounded-[10px] border border-white/10 px-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#1d9e75] focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)' }}
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
        <div ref={departureWrapRef} className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5dcaa5]">Nereden kalkıyorsunuz?</span>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={departureSearch}
              onChange={(e) => handleDepartureSearch(e.target.value)}
              onFocus={() => {
                if (departureSuggestions.length > 0) setShowDepartureSuggestions(true);
              }}
              placeholder="Şehir veya havalimanı ara..."
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
              }}
            />
            {showDepartureSuggestions && departureSuggestions.length > 0 ? (
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
                  overflow: 'hidden',
                }}
              >
                {departureSuggestions.map((a, i) => (
                  <div
                    key={a.code}
                    role="button"
                    tabIndex={0}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDepartureIata(a.code);
                      setDepartureSearch(a.name);
                      setShowDepartureSuggestions(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDepartureIata(a.code);
                        setDepartureSearch(a.name);
                        setShowDepartureSuggestions(false);
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom:
                        i < departureSuggestions.length - 1
                          ? '0.5px solid rgba(255,255,255,0.06)'
                          : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 500 }}>{a.name}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{a.code}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2">
          <label className="flex min-w-0 w-full flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Gidiş Tarihi</span>
            <input
              type="date"
              value={startDate}
              min={minStartDate}
              placeholder="gg.aa.yyyy"
              onChange={(e) => {
                const v = e.target.value;
                setStartDate(v);
                if (!v) {
                  checkLongTripForDates('', endDate);
                  return;
                }
                const nextMinEnd = new Date(new Date(v).getTime() + 86400000).toISOString().split('T')[0];
                const adjustedEnd = endDate && endDate < nextMinEnd ? nextMinEnd : endDate;
                if (adjustedEnd !== endDate) {
                  setEndDate(adjustedEnd);
                }
                checkLongTripForDates(v, adjustedEnd);
              }}
              onClick={openPickerOnClick}
              className="h-12 min-h-12 min-w-0 w-full cursor-pointer rounded-[10px] border border-white/15 bg-white/[0.06] px-3 text-[15px] text-white placeholder:text-white/45 focus:border-[#1d9e75] focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </label>
          <label className="flex min-w-0 w-full flex-col gap-1">
            <span className="text-[12px] text-[#5dcaa5]">Dönüş Tarihi</span>
            <input
              type="date"
              value={endDate}
              min={minEndDate}
              placeholder="gg.aa.yyyy"
              onChange={(e) => {
                const v = e.target.value;
                setEndDate(v);
                checkLongTripForDates(startDate, v);
              }}
              onClick={openPickerOnClick}
              className="h-12 min-h-12 min-w-0 w-full cursor-pointer rounded-[10px] border border-white/15 bg-white/[0.06] px-3 text-[15px] text-white placeholder:text-white/45 focus:border-[#1d9e75] focus:outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </label>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex w-full min-w-0 flex-col gap-1">
          <span className="text-[12px] text-[#5dcaa5]">Kimlerle?</span>
          <select
            value={people}
            onChange={(e) => setPeople(e.target.value as PlanRequest['people'])}
            className="h-11 w-full min-w-0 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
          >
            <option value="yalniz">Yalnız</option>
            <option value="cift">Çift</option>
            <option value="aile">Aile</option>
            <option value="arkadasgrubu">Arkadaş grubu</option>
          </select>
        </label>
        <label className="flex w-full min-w-0 flex-col gap-1">
          <span className="text-[12px] text-[#5dcaa5]">Tatil tipi?</span>
          <select
            value={tripType}
            onChange={(e) => setTripType(e.target.value as PlanRequest['tripType'])}
            className="h-11 w-full min-w-0 rounded-[10px] border border-white/10 bg-[#0a0a0f]/40 px-3 text-[15px] text-white focus:border-[#1d9e75] focus:outline-none"
          >
            <option value="tarih">Tarih</option>
            <option value="deniz">Deniz</option>
            <option value="doga">Doğa</option>
            <option value="karma">Karma</option>
          </select>
        </label>
      </div>

      <div
        className={`mt-3 grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
          people === 'aile' || people === 'arkadasgrubu' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`space-y-3 border-t border-white/10 pt-3 transition-opacity duration-300 ease-out ${
              people === 'aile' || people === 'arkadasgrubu' ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {people === 'aile' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberStepRow
                  label="Yetişkin sayısı"
                  value={familyAdults}
                  min={2}
                  max={10}
                  onChange={setFamilyAdults}
                />
                <NumberStepRow
                  label="Çocuk sayısı"
                  value={familyChildren}
                  min={0}
                  max={6}
                  onChange={setFamilyChildrenCount}
                />
                <NumberStepRow
                  label="Oda sayısı"
                  value={familyRooms}
                  min={1}
                  max={5}
                  onChange={setFamilyRooms}
                />
                {familyChildren > 0 ? (
                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-[12px] text-white/50">Çocuk yaşları</span>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {familyChildAges.slice(0, familyChildren).map((age, idx) => (
                        <NumberStepRow
                          key={idx}
                          label={`${idx + 1}. çocuk yaşı`}
                          value={age}
                          min={0}
                          max={17}
                          onChange={(n) =>
                            setFamilyChildAges((prev) => {
                              const next = [...prev];
                              next[idx] = n;
                              return next;
                            })
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {people === 'arkadasgrubu' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberStepRow
                  label="Kişi sayısı"
                  value={friendsCount}
                  min={2}
                  max={20}
                  onChange={setFriendsCount}
                />
                <NumberStepRow
                  label="Oda sayısı"
                  value={friendsRooms}
                  min={1}
                  max={10}
                  onChange={setFriendsRooms}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 w-full">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-[#5dcaa5]">Bütçe?</span>
          <input
            type="text"
            value={budgetDisplay}
            onChange={(e) => handleBudgetChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                const newNumbers = budget.slice(0, -1);
                setBudget(newNumbers);
                if (newNumbers === '') {
                  setBudgetDisplay('');
                } else {
                  const formatted = new Intl.NumberFormat('tr-TR').format(Number(newNumbers));
                  setBudgetDisplay(formatted + ' ₺');
                }
                e.preventDefault();
              }
            }}
            placeholder="Örn. 50.000 ₺"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
            }}
          />
        </label>
      </div>

      {budget ? (
        <>
          <div
            className="w-full"
            style={{
              marginTop: 8,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.6,
            }}
          >
            {(() => {
              const included = [
                budgetIncludes.flight && 'uçak bileti',
                budgetIncludes.car && 'araç kiralama',
                budgetIncludes.hotel && 'konaklama',
                budgetIncludes.food && 'yeme-içme',
                budgetIncludes.activities && 'aktiviteler',
              ].filter(Boolean) as string[];

              if (included.length === 0) {
                return '💡 Bütçenize nelerin dahil olduğunu seçin.';
              }
              return `💰 ${Number(budget).toLocaleString('tr-TR')} ₺ bütçenizden ${included.join(', ')} karşılanacak. Bütçenize uygun plan oluşturulacak.`;
            })()}
          </div>
          <div
            className="w-full"
            style={{
              marginTop: 8,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Bu bütçeye neler dahil?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(
                [
                  { key: 'flight', label: '✈️ Uçak bileti' },
                  { key: 'car', label: '🚗 Araç kiralama' },
                  { key: 'hotel', label: '🏨 Konaklama' },
                  { key: 'food', label: '🍽️ Yeme-içme' },
                  { key: 'activities', label: '🎯 Aktiviteler' },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setBudgetIncludes((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className="text-[11px] px-2 py-1 md:px-3 md:py-1.5 md:text-xs"
                  style={{
                    borderRadius: 999,
                    cursor: 'pointer',
                    border: '0.5px solid',
                    borderColor: budgetIncludes[item.key]
                      ? 'rgba(29,158,117,0.6)'
                      : 'rgba(255,255,255,0.15)',
                    background: budgetIncludes[item.key]
                      ? 'rgba(29,158,117,0.15)'
                      : 'transparent',
                    color: budgetIncludes[item.key] ? '#5dcaa5' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-3 grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:items-center">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignSelf: 'start',
          }}
        >
          <div
            role="switch"
            aria-checked={hasRentalCar}
            tabIndex={0}
            onClick={() => setHasRentalCar(!hasRentalCar)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setHasRentalCar(!hasRentalCar);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              userSelect: 'none',
              paddingTop: 4,
            }}
          >
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 999,
                background: hasRentalCar ? '#1d9e75' : 'rgba(255,255,255,0.1)',
                border: '0.5px solid',
                borderColor: hasRentalCar ? '#1d9e75' : 'rgba(255,255,255,0.2)',
                position: 'relative',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: hasRentalCar ? 22 : 3,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#ffffff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 13,
                color: hasRentalCar ? '#ffffff' : 'rgba(255,255,255,0.5)',
                transition: 'color 0.2s',
              }}
            >
              🚗 Araç kiraladım
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 12px',
              background: 'rgba(29,158,117,0.08)',
              border: '0.5px solid rgba(29,158,117,0.25)',
              borderRadius: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.5,
            }}
          >
            🚗 Araç kiraladıysanız planınız çevre şehirlere günübirlik geziler ve daha fazla konum içerecek.
          </div>
        </div>

        <div
          role="group"
          aria-labelledby="hero-flight-ticket-label"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div id="hero-flight-ticket-label" style={{ fontSize: 12, color: '#5dcaa5' }}>
            Uçak biletiniz var mı?
          </div>
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
        </div>
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
                      onClick={openPickerOnClick}
                      style={PICKER_INPUT_STYLE}
                    />
                    <span className="text-[11px] text-white/40">örn. 17:00</span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-[#5dcaa5]">Dönüş havalimanından kalkış saatiniz</span>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      onClick={openPickerOnClick}
                      style={PICKER_INPUT_STYLE}
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
              ✈️ Uçak biletinizi henüz almadıysanız plan oluşturduktan sonra size en uygun uçuşları göstereceğiz.
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

    {trialLimitOpen ? (
      <div
        className={modalOverlayClass}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setTrialLimitOpen(false);
        }}
      >
        <div className={modalPanelClass} role="dialog" aria-modal="true" aria-labelledby="trial-limit-title">
          <h2 id="trial-limit-title" className="text-[17px] font-semibold text-white">
            {TRIAL_LIMIT_TITLE}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">{TRIAL_LIMIT_DESCRIPTION}</p>
          <button
            type="button"
            onClick={() => setTrialLimitOpen(false)}
            className="mt-6 w-full rounded-[10px] bg-[#1d9e75] py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95"
          >
            Tamam
          </button>
        </div>
      </div>
    ) : null}

    {longTripPromptOpen ? (
      <div
        className={modalOverlayClass}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) setLongTripPromptOpen(false);
        }}
      >
        <div className={modalPanelClass} role="dialog" aria-modal="true" aria-labelledby="long-trip-title">
          <h2 id="long-trip-title" className="text-[17px] font-semibold text-white">
            {LONG_TRIP_LOGIN_MESSAGE}
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/55">
            4 geceden uzun tatiller için hesabınıza giriş yapmanız gerekir.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex-1 rounded-[10px] bg-[#1d9e75] py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-95"
            >
              Giriş yap
            </button>
            <button
              type="button"
              onClick={() => setLongTripPromptOpen(false)}
              className="flex-1 rounded-[10px] border border-white/15 bg-white/[0.06] py-2.5 text-[14px] font-medium text-white/80 transition hover:bg-white/[0.1]"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    ) : null}

    <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
