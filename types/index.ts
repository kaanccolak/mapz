export type DepartureIata = 'ADB' | 'SAW' | 'IST' | 'ESB' | 'AYT' | 'BJV' | 'DLM' | 'TZX';

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

export interface PlanRequest {
  destination: string;
  /** Kalkış havalimanı IATA (form dropdown) */
  departureIata: DepartureIata;
  startDate: string;
  endDate: string;
  people: 'yalniz' | 'cift' | 'aile' | 'arkadasgrubu';
  tripType: 'tarih' | 'deniz' | 'doga' | 'karma';
  budget: string;
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
