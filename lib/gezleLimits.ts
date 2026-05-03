/** Başarılı plan oluşturma sayısı (cihaz başına, girişten bağımsız). */
export const GEZLE_QUERY_COUNT_KEY = 'gezle_query_count';

export const MAX_TRIAL_PLANS = 2;

export const TRIAL_LIMIT_TITLE = 'Deneme limitine ulaştınız 🎯';

export const TRIAL_LIMIT_DESCRIPTION =
  'Bu cihazdan 2 plan oluşturdunuz. Gezle şu an deneme aşamasında olduğu için cihaz başına 2 plan limiti uygulanıyor.';

export const LONG_TRIP_LOGIN_MESSAGE = 'Giriş yaparak daha uzun planlar oluşturabilirsiniz 🗺️';

export function getGezleQueryCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(GEZLE_QUERY_COUNT_KEY);
    const n = parseInt(raw ?? '0', 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(999, n);
  } catch {
    return 0;
  }
}

/** Yalnızca API planı başarıyla döndükten sonra çağrılmalı. */
export function incrementGezleQueryCountAfterSuccess(): void {
  try {
    const n = getGezleQueryCount();
    localStorage.setItem(GEZLE_QUERY_COUNT_KEY, String(n + 1));
  } catch {
    /* quota / private mode */
  }
}
