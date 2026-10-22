import type { DonutSegment } from "@/components/charts/donut-chart";
import type { CashflowDatum } from "@/components/charts/cashflow-chart";
import { categoryColor, colorSlot } from "@/config/categories";
import type { FinanceSummary } from "@/lib/queries/finance";
import { monthDate } from "@/lib/month";

const intl = (locale: string) => (locale === "id" ? "id-ID" : "en-US");

export function toCashflowData(monthly: FinanceSummary["monthly"], locale: string): CashflowDatum[] {
  const short = new Intl.DateTimeFormat(intl(locale), { month: "short", timeZone: "UTC" });
  const long = new Intl.DateTimeFormat(intl(locale), { month: "long", year: "numeric", timeZone: "UTC" });
  return monthly.map((m) => ({
    key: m.month,
    label: short.format(monthDate(m.month)),
    fullLabel: long.format(monthDate(m.month)),
    income: m.income,
    expense: m.expense,
  }));
}

/**
 * Maks. 5 kategori terbesar + "Lainnya" (≤ 6 potongan). Potongan lalu diurutkan
 * menurut slot palet agar warna bersebelahan selalu mudah dibedakan (aman buta warna).
 */
export function toDonutSegments(
  byCategory: FinanceSummary["byCategory"],
  labels: { others: string; uncategorized: string },
): DonutSegment[] {
  const named = byCategory.filter((c) => c.categoryId && colorSlot(c.color) !== 99);
  const top = named.slice(0, 5);
  const rest = byCategory.filter((c) => !top.includes(c)).reduce((sum, c) => sum + c.total, 0);

  const segments: DonutSegment[] = top
    .sort((a, b) => colorSlot(a.color) - colorSlot(b.color))
    .map((c) => ({ id: c.categoryId!, label: c.name ?? labels.uncategorized, value: c.total, color: categoryColor(c.color) }));

  if (rest > 0) segments.push({ id: "others", label: labels.others, value: rest, color: "var(--viz-other)" });
  return segments;
}

/** Perubahan persen terhadap bulan lalu (null jika bulan lalu 0). */
export function percentChange(current: number, previous: number | undefined) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
