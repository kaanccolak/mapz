/** Rakamları 00–23 saat ve 00–59 dakika aralığına sıkıştırır (en fazla 4 hane). */
function sanitizeClockDigits(d: string): string {
  if (!d) return '';
  let h1 = d[0];
  if (h1 > '2') h1 = '2';
  if (d.length === 1) return h1;

  let h = parseInt(h1 + d[1], 10);
  if (Number.isNaN(h)) h = 0;
  if (h > 23) h = 23;
  const hh = String(h).padStart(2, '0');

  if (d.length === 2) return hh;

  if (d.length === 3) {
    let m1 = d[2];
    if (m1 > '5') m1 = '5';
    return hh + m1;
  }

  let mm = parseInt(d[2] + d[3], 10);
  if (Number.isNaN(mm)) mm = 0;
  if (mm > 59) mm = 59;
  return hh + String(mm).padStart(2, '0');
}

/** Saat metni: rakamlar, en fazla 4 hane; 2. haneden sonra ":"; geçersiz saat/dakika sıkıştırılır. */
export function formatClockInput(raw: string): string {
  const digits = sanitizeClockDigits(raw.replace(/\D/g, '').slice(0, 4));
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Tam ss:aa ve 00:00–23:59 aralığı (24 saat). */
export function isValidClockTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s.trim());
}
