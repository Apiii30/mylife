import { z } from "zod";
import { badRequest } from "./http-error.js";

/** "2026-10" → rentang [1 Okt, 1 Nov) dalam UTC (kolom `date` bertipe DATE tanpa zona waktu). */
export function monthRange(month: string, span = 1) {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) throw badRequest("INVALID_MONTH");
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m - 1 + span, 1));
  return { start, end };
}

/** Daftar kunci bulan "YYYY-MM" sebanyak `count` yang berakhir di `month`. */
export function monthKeys(month: string, count: number) {
  const { start } = monthRange(month);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan: YYYY-MM");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal: YYYY-MM-DD");

/** "2026-10-21" → Date UTC tengah malam (cocok untuk kolom DATE). */
export const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
export const formatDate = (date: Date) => date.toISOString().slice(0, 10);
