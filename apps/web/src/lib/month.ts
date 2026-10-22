/** Kunci bulan "YYYY-MM" untuk hari ini di zona waktu tertentu. */
export function currentMonthKey(timeZone = "Asia/Jakarta", now = new Date()) {
  return todayKey(timeZone, now).slice(0, 7);
}

/** "YYYY-MM-DD" untuk hari ini di zona waktu tertentu. */
export function todayKey(timeZone = "Asia/Jakarta", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-10" → Date (UTC) untuk diformat. */
export const monthDate = (key: string) => new Date(`${key}-01T00:00:00Z`);
export const dayDate = (key: string) => new Date(`${key}T00:00:00Z`);

export const isMonthKey = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Geser kunci tanggal "YYYY-MM-DD" sebanyak n hari. */
export function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
