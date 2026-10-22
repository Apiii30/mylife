import { Router } from "express";
import { z } from "zod";
import { formatDate, monthKeys, monthRange, monthSchema } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseQuery } from "../../middleware/validate.js";

export const financeRouter = Router();
financeRouter.use(requireAuth);

const summaryQuery = z.object({
  month: monthSchema,
  months: z.coerce.number().int().min(1).max(24).default(6),
});

type Totals = { income: number; expense: number };

/**
 * Semua angka untuk dashboard & halaman keuangan dalam satu request:
 * total bulan ini + bulan lalu, tren beberapa bulan, pengeluaran per kategori,
 * dan saldo kumulatif harian (untuk sparkline).
 */
financeRouter.get("/summary", async (req, res) => {
  const userId = userIdOf(req);
  const { month, months } = parseQuery(summaryQuery, req);

  const keys = monthKeys(month, months);
  const trendStart = monthRange(keys[0]).start;
  const { start, end } = monthRange(month);

  const [monthlyRows, byCategoryRows, dailyRows] = await Promise.all([
    prisma.$queryRaw<{ month: string; type: "INCOME" | "EXPENSE"; total: number }[]>`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, "type", SUM(amount)::float8 AS total
      FROM transactions
      WHERE user_id = ${userId} AND "date" >= ${trendStart} AND "date" < ${end}
      GROUP BY 1, 2`,
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["date", "type"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Tren per bulan (bulan tanpa transaksi tetap muncul dengan nilai 0)
  const monthly = keys.map((key) => {
    const totals: Totals = { income: 0, expense: 0 };
    for (const row of monthlyRows) {
      if (row.month !== key) continue;
      if (row.type === "INCOME") totals.income = row.total;
      else totals.expense = row.total;
    }
    return { month: key, ...totals };
  });

  const current = monthly.at(-1)!;
  const previous = monthly.at(-2) ?? null;

  // Pengeluaran per kategori, lengkap dengan nama & warna
  const categoryIds = byCategoryRows.flatMap((row) => (row.categoryId ? [row.categoryId] : []));
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, color: true, icon: true },
  });
  const byCategory = byCategoryRows
    .map((row) => {
      const category = categories.find((c) => c.id === row.categoryId);
      return {
        categoryId: row.categoryId,
        name: category?.name ?? null,
        color: category?.color ?? "gray",
        icon: category?.icon ?? null,
        total: Number(row._sum.amount ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Saldo kumulatif per hari dalam bulan ini
  let running = 0;
  const daily: { date: string; balance: number }[] = [];
  for (const row of dailyRows) {
    const amount = Number(row._sum.amount ?? 0);
    running += row.type === "INCOME" ? amount : -amount;
    const date = formatDate(row.date);
    if (daily.at(-1)?.date === date) daily[daily.length - 1].balance = running;
    else daily.push({ date, balance: running });
  }

  res.json({
    month,
    totals: { ...current, balance: current.income - current.expense },
    previous: previous && { ...previous, balance: previous.income - previous.expense },
    monthly,
    byCategory,
    daily,
  });
});
