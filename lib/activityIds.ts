import type { Activity } from '@/types';

/** Silme/geri yükleme ve sıralama için sabit kimlik (manuel veya geçiş dönemi). */
export function stableActivityId(dayNumber: number, index: number, activity: Activity): string {
  const raw = activity.id?.trim();
  if (raw) return raw;
  return `${dayNumber}-${index}`;
}
