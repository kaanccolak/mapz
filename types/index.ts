/** Türkiye kalkış havalimanları (IATA); HeroSearch ile senkron */
export type DepartureIata =
  | 'ADB'
  | 'ADF'
  | 'AFY'
  | 'AJI'
  | 'AOE'
  | 'ASR'
  | 'AYT'
  | 'BAL'
  | 'BJV'
  | 'BOL'
  | 'BXN'
  | 'BZI'
  | 'CKZ'
  | 'COV'
  | 'DLM'
  | 'DIY'
  | 'EDO'
  | 'ESB'
  | 'ERC'
  | 'ERZ'
  | 'GKD'
  | 'GNY'
  | 'GZP'
  | 'GZT'
  | 'HTY'
  | 'IGD'
  | 'ISE'
  | 'IST'
  | 'KCM'
  | 'KFS'
  | 'KSY'
  | 'KZR'
  | 'KYA'
  | 'MLX'
  | 'MQM'
  | 'MSR'
  | 'MZH'
  | 'NAV'
  | 'NOP'
  | 'OGU'
  | 'ONQ'
  | 'RTE'
  | 'RZV'
  | 'SAW'
  | 'SFQ'
  | 'SIC'
  | 'SZF'
  | 'TEQ'
  | 'TEV'
  | 'TJK'
  | 'TZX'
  | 'USQ'
  | 'VAN'
  | 'VAS'
  | 'YEI';

export type ActivityType = 'gezi' | 'yemek' | 'kafe' | 'aktif';

export interface Activity {
  time: string;
  name: string;
  description: string;
  type: ActivityType;
  duration: string;
  /** Varsa haritada pin; yoksa yalnızca gün merkezi (mapQuery) ile yaklaşık konum */
  lat?: number;
  lng?: number;
}

export interface Day {
  dayNumber: number;
  date: string;
  city: string;
  title: string;
  mapQuery: string;
  activities: Activity[];
}

export interface HotelSuggestion {
  city: string;
  nights: number;
  /** Bütçe bandına göre otel tipi (Claude) */
  category?: string;
  bookingUrl?: string;
  bookingSearchUrl?: string;
}

export interface BudgetBreakdown {
  ucak: string;
  konaklama: string;
  aracKiralama: string;
  yemeIcme: string;
  gezmeAktivite: string;
  alisveris: string;
}

export interface TripPlan {
  tripTitle: string;
  days: Day[];
  hotelSuggestions: HotelSuggestion[];
  budgetBreakdown: BudgetBreakdown;
}

export interface BudgetIncludes {
  flight: boolean;
  car: boolean;
  hotel: boolean;
  food: boolean;
  activities: boolean;
}

/** Eski kayıtlarda alan yoksa: konaklama / yeme-içme / aktiviteler dahil (form varsayılanıyla uyumlu). */
export const DEFAULT_BUDGET_INCLUDES: BudgetIncludes = {
  flight: false,
  car: false,
  hotel: true,
  food: true,
  activities: true,
};

export function mergeBudgetIncludes(partial?: Partial<BudgetIncludes> | null): BudgetIncludes {
  const d = DEFAULT_BUDGET_INCLUDES;
  if (!partial || typeof partial !== 'object') return { ...d };
  return {
    flight: typeof partial.flight === 'boolean' ? partial.flight : d.flight,
    car: typeof partial.car === 'boolean' ? partial.car : d.car,
    hotel: typeof partial.hotel === 'boolean' ? partial.hotel : d.hotel,
    food: typeof partial.food === 'boolean' ? partial.food : d.food,
    activities: typeof partial.activities === 'boolean' ? partial.activities : d.activities,
  };
}

export interface PlanRequest {
  destination: string;
  /** Kalkış havalimanı IATA (form dropdown) */
  departureIata: DepartureIata;
  /** Varış havalimanı IATA (Photon / form); yoksa destinasyon metnine göre çözülür */
  destinationAirportIata?: string;
  startDate: string;
  endDate: string;
  people: 'yalniz' | 'cift' | 'aile' | 'arkadasgrubu';
  tripType: 'tarih' | 'deniz' | 'doga' | 'karma';
  budget: string;
  /** Toplam bütçeye hangi harcama gruplarının dahil olduğu */
  budgetIncludes: BudgetIncludes;
  hasRentalCar: boolean;
  /** true: bilet var (iniş/kalkış saatleri); false: Skyscanner ile aranacak */
  hasTicket: boolean;
  /** Yerel saat "HH:MM", yalnızca hasTicket true iken */
  arrivalTime?: string;
  /** Yerel saat "HH:MM", yalnızca hasTicket true iken */
  departureTime?: string;
}

export interface StoredTrip {
  plan: TripPlan;
  request: PlanRequest;
}
