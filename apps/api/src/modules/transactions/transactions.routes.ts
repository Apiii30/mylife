import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { dateSchema, formatDate, monthRange, monthSchema, parseDate } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const select = {
  id: true,
  type: true,
  amount: true,
  date: true,
  note: true,
  category: { select: { id: true, name: true, color: true, icon: true } },
} satisfies Prisma.TransactionSelect;

type Row = Prisma.TransactionGetPayload<{ select: typeof select }>;

/** Decimal → number dan Date → "YYYY-MM-DD" agar mudah dipakai di frontend. */
export const serialize = (t: Row) => ({ ...t, amount: Number(t.amount), date: formatDate(t.date) });

const type = z.enum(["INCOME", "EXPENSE"]);

const listQuery = z.object({
  month: monthSchema.optional(),
  type: type.optional(),
  categoryId: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

transactionsRouter.get("/", async (req, res) => {
  const query = parseQuery(listQuery, req);
  const range = query.month ? monthRange(query.month) : undefined;

  const rows = await prisma.transaction.findMany({
    where: {
      userId: userIdOf(req),
      type: query.type,
      categoryId: query.categoryId,
      ...(range && { date: { gte: range.start, lt: range.end } }),
      ...(query.q && { note: { contains: query.q, mode: "insensitive" } }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: query.limit,
    select,
  });
  res.json({ transactions: rows.map(serialize) });
});

const bodySchema = z.object({
  type,
  amount: z.coerce.number().positive().max(999_999_999_999),
  date: dateSchema,
  categoryId: z.string().nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

/** Pastikan kategori milik user dan jenisnya cocok dengan transaksi. */
async function assertCategory(userId: string, categoryId: string | null | undefined, kind: "INCOME" | "EXPENSE") {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { kind: true } });
  if (!category) throw badRequest("INVALID_CATEGORY");
  if (category.kind !== kind) throw badRequest("CATEGORY_KIND_MISMATCH");
}

transactionsRouter.post("/", async (req, res) => {
  const userId = userIdOf(req);
  const data = parseBody(bodySchema, req);
  await assertCategory(userId, data.categoryId, data.type);

  const row = await prisma.transaction.create({
    data: { ...data, date: parseDate(data.date), note: data.note || null, userId },
    select,
  });
  res.status(201).json({ transaction: serialize(row) });
});

transactionsRouter.patch("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const data = parseBody(bodySchema.partial(), req);
  const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId }, select: { type: true } });
  if (!existing) throw notFound();
  await assertCategory(userId, data.categoryId, data.type ?? existing.type);

  const row = await prisma.transaction.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.date && { date: parseDate(data.date) }) },
    select,
  });
  res.json({ transaction: serialize(row) });
});

transactionsRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.transaction.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
