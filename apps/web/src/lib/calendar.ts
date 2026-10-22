/**
 * Logika kalender murni (tanpa React): pengulangan acara, grid bulan, penempatan
 * acara multi-hari ke "jalur", dan tata letak acara yang bertabrakan di grid jam.
 * Semua kunci tanggal "YYYY-MM-DD" memakai zona waktu perangkat.
 */
import { addDays } from "@/lib/month";
import { localDateKey } from "@/lib/task-dates";

export type EventRepeat = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  repeat: EventRepeat;
  color: string;
  start: string; // allDay: "YYYY-MM-DD", selain itu ISO
  end: string; // allDay: tanggal terakhir (inklusif)
};

export type OccurrenceKind = "event" | "task" | "goal";

/** Satu kemunculan di kalender — acara (atau satu pengulangannya), tugas, atau tenggat goal. */
export type Occurrence = {
  key: string;
  kind: OccurrenceKind;
  id: string;
  title: string;
  color: string;
  allDay: boolean;
  start: Date;
  end: Date;
  startKey: string;
  endKey: string; // inklusif
  done?: boolean;
  location?: string | null;
  repeat?: EventRepeat;
};

export const WEEK_DAYS = 7;
const DAY_MS = 86_400_000;

const parts = (key: string) => key.split("-").map(Number) as [number, number, number];

/** Selisih hari b − a. */
export function dayDiff(a: string, b: string) {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

/** Kunci tanggal + menit sejak tengah malam → Date lokal. */
export function keyToDate(key: string, minutes = 0) {
  const [y, m, d] = parts(key);
  return new Date(y, m - 1, d, 0, minutes);
}

export const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Senin di minggu yang memuat `key`. */
export function startOfWeek(key: string) {
  const weekday = (keyToDate(key).getDay() + 6) % 7; // Senin = 0
  return addDays(key, -weekday);
}

export const weekKeys = (key: string) => Array.from({ length: WEEK_DAYS }, (_, i) => addDays(startOfWeek(key), i));

/** 6 baris × 7 hari, dimulai Senin sebelum/tepat tanggal 1. Tinggi grid jadi selalu sama. */
export function monthGrid(month: string) {
  const first = startOfWeek(`${month}-01`);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: WEEK_DAYS }, (_, d) => addDays(first, w * WEEK_DAYS + d)));
}

// ─── Pengulangan ───────────────────────────────────────────

const MAX_PERIOD: Record<Exclude<EventRepeat, "NONE">, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 31, YEARLY: 366 };

/** Tanggal kemunculan ke-n, atau null bila tanggalnya tidak ada (31 Feb, 29 Feb non-kabisat). */
function nthKey(key: string, repeat: EventRepeat, n: number): string | null {
  const [y, m, d] = parts(key);
  switch (repeat) {
    case "NONE":
      return n === 0 ? key : null;
    case "DAILY":
      return addDays(key, n);
    case "WEEKLY":
      return addDays(key, n * 7);
    case "MONTHLY": {
      const date = new Date(Date.UTC(y, m - 1 + n, d));
      return date.getUTCDate() === d ? date.toISOString().slice(0, 10) : null;
    }
    case "YEARLY": {
      const date = new Date(Date.UTC(y + n, m - 1, d));
      return date.getUTCMonth() === m - 1 ? date.toISOString().slice(0, 10) : null;
    }
  }
}

/** Jabarkan acara (termasuk pengulangannya) yang bersinggungan dengan [from, to). */
export function expandEvents(events: CalEvent[], from: string, to: string, color: (name: string) => string): Occurrence[] {
  const out: Occurrence[] = [];

  for (const event of events) {
    const base = event.allDay
      ? { key: event.start, minutes: 0, spanDays: Math.max(0, dayDiff(event.start, event.end)), durationMs: 0 }
      : (() => {
          const start = new Date(event.start);
          const durationMs = Math.max(0, new Date(event.end).getTime() - start.getTime());
          const key = localDateKey(start);
          return { key, minutes: minutesOf(start), spanDays: dayDiff(key, localDateKey(new Date(start.getTime() + Math.max(0, durationMs - 1)))), durationMs };
        })();

    const first =
      event.repeat === "NONE" ? 0 : Math.max(0, Math.floor((dayDiff(base.key, from) - base.spanDays - 1) / MAX_PERIOD[event.repeat]));

    for (let n = first, guard = 0; guard < 800; n++, guard++) {
      const key = nthKey(base.key, event.repeat, n);
      if (event.repeat === "NONE" && n > 0) break;
      if (!key) continue;
      if (key >= to) break;

      const endKey = addDays(key, base.spanDays);
      if (endKey < from) continue;

      const start = keyToDate(key, base.minutes);
      const end = event.allDay ? keyToDate(addDays(endKey, 1)) : new Date(start.getTime() + base.durationMs);
      out.push({
        key: `${event.id}:${key}`,
        kind: "event",
        id: event.id,
        title: event.title,
        color: color(event.color),
        allDay: event.allDay,
        start,
        end,
        startKey: key,
        endKey,
        location: event.location,
        repeat: event.repeat,
      });
    }
  }
  return out;
}

/** Urutan tampil: seharian/multi-hari dulu, lalu berdasarkan jam mulai, lalu yang lebih panjang. */
export function compareOccurrences(a: Occurrence, b: Occurrence) {
  const spanA = Number(a.allDay || a.startKey !== a.endKey);
  const spanB = Number(b.allDay || b.startKey !== b.endKey);
  return (
    spanB - spanA ||
    a.startKey.localeCompare(b.startKey) ||
    dayDiff(b.startKey, b.endKey) - dayDiff(a.startKey, a.endKey) ||
    a.start.getTime() - b.start.getTime() ||
    a.title.localeCompare(b.title)
  );
}

export const occursOn = (occ: Occurrence, key: string) => occ.startKey <= key && occ.endKey >= key;

// ─── Jalur (lane) untuk baris minggu ───────────────────────

export type LanePlacement = {
  occ: Occurrence;
  col: number; // 0–6
  span: number;
  lane: number;
  clippedStart: boolean; // berlanjut dari minggu sebelumnya
  clippedEnd: boolean; // berlanjut ke minggu berikutnya
};

/**
 * Tempatkan kemunculan ke jalur horizontal satu baris minggu (greedy, mirip Apple Calendar).
 * Yang tidak muat di `maxLanes` dihitung per hari sebagai "+N lainnya".
 */
export function layoutWeek(week: string[], occurrences: Occurrence[], maxLanes: number) {
  const first = week[0];
  const last = week[week.length - 1];
  const taken: boolean[][] = [];
  const placed: LanePlacement[] = [];
  const hidden = new Array<number>(week.length).fill(0);

  const items = occurrences.filter((o) => o.startKey <= last && o.endKey >= first).sort(compareOccurrences);

  for (const occ of items) {
    const col = Math.max(0, dayDiff(first, occ.startKey));
    const endCol = Math.min(week.length - 1, dayDiff(first, occ.endKey));
    let lane = 0;
    while (taken[lane]?.slice(col, endCol + 1).some(Boolean)) lane++;

    if (lane >= maxLanes) {
      for (let c = col; c <= endCol; c++) hidden[c]++;
      continue;
    }
    taken[lane] ??= new Array(week.length).fill(false);
    for (let c = col; c <= endCol; c++) taken[lane][c] = true;
    placed.push({ occ, col, span: endCol - col + 1, lane, clippedStart: occ.startKey < first, clippedEnd: occ.endKey > last });
  }
  return { placed, hidden, lanes: taken.length };
}

// ─── Grid jam ──────────────────────────────────────────────

export type TimedPlacement = { occ: Occurrence; top: number; bottom: number; column: number; columns: number };

/**
 * Posisi acara berjam dalam satu hari (menit 0–1440). Acara yang saling tumpang-tindih
 * dikelompokkan lalu dibagi rata ke kolom-kolom.
 */
export function layoutDay(day: string, occurrences: Occurrence[], minDuration = 20): TimedPlacement[] {
  const dayStart = keyToDate(day).getTime();
  const dayEnd = keyToDate(addDays(day, 1)).getTime();

  const items = occurrences
    .filter((o) => !o.allDay && o.start.getTime() < dayEnd && Math.max(o.end.getTime(), o.start.getTime() + 1) > dayStart)
    .map((occ) => {
      const top = Math.max(0, (occ.start.getTime() - dayStart) / 60_000);
      const bottom = Math.min(1440, Math.max(top + minDuration, (occ.end.getTime() - dayStart) / 60_000));
      return { occ, top, bottom, column: 0, columns: 1 };
    })
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);

  let cluster: TimedPlacement[] = [];
  let clusterEnd = -1;
  const columnsEnd: number[] = [];

  const flush = () => {
    const columns = Math.max(1, ...cluster.map((p) => p.column + 1));
    for (const p of cluster) p.columns = columns;
    cluster = [];
    columnsEnd.length = 0;
  };

  for (const item of items) {
    if (item.top >= clusterEnd && cluster.length) flush();
    let column = columnsEnd.findIndex((end) => end <= item.top);
    if (column === -1) column = columnsEnd.length;
    columnsEnd[column] = item.bottom;
    item.column = column;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.bottom);
  }
  if (cluster.length) flush();
  return items;
}

/** Geser acara n hari (seri pengulangan ikut bergeser). */
export function shiftEvent(event: CalEvent, days: number, minutes = 0): Pick<CalEvent, "start" | "end"> {
  if (event.allDay) return { start: addDays(event.start, days), end: addDays(event.end, days) };
  const shift = (iso: string) => {
    const date = new Date(iso);
    date.setDate(date.getDate() + days);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  };
  return { start: shift(event.start), end: shift(event.end) };
}
