import type { Activity } from '@/types';

function timeToMinutes(t: string): number {
  const s = (t ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return 24 * 60 + 1;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

export function sortActivitiesByTime(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}
