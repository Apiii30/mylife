import { Router } from "express";
import { z } from "zod";
import { badRequest, notFound } from "../../lib/http-error.js";
import { dateSchema, formatDate, parseDate } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody } from "../../middleware/validate.js";
import { goalSelect, savedByGoal, savingsCategory, serializeGoal, syncGoalStatus } from "./goals.service.js";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

const COLORS = ["blue", "orange", "teal", "yellow", "pink", "green", "purple", "red"] as const;

async function ownedGoal(userId: string, id: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId }, select: { id: true, title: true, type: true } });
  if (!goal) throw notFound();
  return goal;
}

async function loadGoal(id: string) {
  const goal = await prisma.goal.findUniqueOrThrow({ where: { id }, select: goalSelect });
  const saved = (await savedByGoal([id])).get(id) ?? 0;
  return serializeGoal(goal, saved);
}

// ─── Goal ──────────────────────────────────────────────────

goalsRouter.get("/", async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { userId: userIdOf(req) },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    select: goalSelect,
  });
  const saved = await savedByGoal(goals.map((g) => g.id));
  res.json({ goals: goals.map((g) => serializeGoal(g, saved.get(g.id) ?? 0)) });
});

goalsRouter.get("/:id", async (req, res) => {
  const userId = userIdOf(req);
  await ownedGoal(userId, req.params.id);
  const deposits = await prisma.goalDeposit.findMany({
    where: { goalId: req.params.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: { id: true, amount: true, date: true, note: true, transactionId: true },
  });
  res.json({
    goal: await loadGoal(req.params.id),
    deposits: deposits.map((d) => ({ ...d, amount: Number(d.amount), date: formatDate(d.date) })),
  });
});

const goalBody = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  type: z.enum(["FINANCIAL", "LIFE"]),
  targetAmount: z.coerce.number().positive().max(999_999_999_999).nullable().optional(),
  deadline: dateSchema.nullable().optional(),
  color: z.enum(COLORS).default("purple"),
  icon: z.string().max(40).default("target"),
  milestones: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
});

goalsRouter.post("/", async (req, res) => {
  const { milestones = [], deadline, ...data } = parseBody(goalBody, req);
  if (data.type === "FINANCIAL" && !data.targetAmount) throw badRequest("TARGET_REQUIRED");

  const goal = await prisma.goal.create({
    data: {
      ...data,
      targetAmount: data.type === "FINANCIAL" ? data.targetAmount : null,
      deadline: deadline ? parseDate(deadline) : null,
      userId: userIdOf(req),
      milestones: { create: milestones.map((title, position) => ({ title, position })) },
    },
    select: { id: true },
  });
  res.status(201).json({ goal: await loadGoal(goal.id) });
});

goalsRouter.patch("/:id", async (req, res) => {
  const existing = await ownedGoal(userIdOf(req), req.params.id);
  const body = parseBody(
    // Tanpa default: field yang tidak dikirim tidak boleh ikut ter-reset (mis. saat arsip)
    goalBody
      .omit({ type: true, milestones: true })
      .extend({ color: z.enum(COLORS), icon: z.string().max(40) })
      .partial()
      .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).optional() }),
    req,
  );
  const { deadline, status, ...data } = body;

  await prisma.goal.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(deadline !== undefined && { deadline: deadline ? parseDate(deadline) : null }),
      ...(status && { status, completedAt: null }),
    },
  });
  // Mengaktifkan kembali goal yang sudah 100% → langsung jadi COMPLETED lagi
  if (status === "ACTIVE" || data.targetAmount !== undefined) await syncGoalStatus(existing.id);
  res.json({ goal: await loadGoal(existing.id) });
});

goalsRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.goal.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  // Transaksi tabungan di Keuangan tetap ada (uangnya memang sudah disisihkan)
  res.status(204).end();
});

// ─── Milestone ─────────────────────────────────────────────

goalsRouter.post("/:id/milestones", async (req, res) => {
  const goal = await ownedGoal(userIdOf(req), req.params.id);
  const { title } = parseBody(z.object({ title: z.string().trim().min(1).max(200) }), req);
  const last = await prisma.goalMilestone.findFirst({ where: { goalId: goal.id }, orderBy: { position: "desc" }, select: { position: true } });
  await prisma.goalMilestone.create({ data: { goalId: goal.id, title, position: (last?.position ?? -1) + 1 } });
  await syncGoalStatus(goal.id);
  res.status(201).json({ goal: await loadGoal(goal.id) });
});

goalsRouter.patch("/:id/milestones/:milestoneId", async (req, res) => {
  const goal = await ownedGoal(userIdOf(req), req.params.id);
  const data = parseBody(z.object({ title: z.string().trim().min(1).max(200).optional(), done: z.boolean().optional() }), req);
  const { count } = await prisma.goalMilestone.updateMany({
    where: { id: req.params.milestoneId, goalId: goal.id },
    data: { ...data, ...(data.done !== undefined && { doneAt: data.done ? new Date() : null }) },
  });
  if (!count) throw notFound();
  await syncGoalStatus(goal.id);
  res.json({ goal: await loadGoal(goal.id) });
});

goalsRouter.delete("/:id/milestones/:milestoneId", async (req, res) => {
  const goal = await ownedGoal(userIdOf(req), req.params.id);
  const { count } = await prisma.goalMilestone.deleteMany({ where: { id: req.params.milestoneId, goalId: goal.id } });
  if (!count) throw notFound();
  await syncGoalStatus(goal.id);
  res.json({ goal: await loadGoal(goal.id) });
});

// ─── Setoran (goal finansial) ──────────────────────────────

const depositBody = z.object({
  amount: z.coerce.number().positive().max(999_999_999_999),
  date: dateSchema,
  note: z.string().trim().max(200).nullable().optional(),
  /** Catat juga sebagai pengeluaran kategori "Tabungan" di Keuangan. */
  recordTransaction: z.boolean().default(true),
});

goalsRouter.post("/:id/deposits", async (req, res) => {
  const userId = userIdOf(req);
  const goal = await ownedGoal(userId, req.params.id);
  if (goal.type !== "FINANCIAL") throw badRequest("NOT_FINANCIAL_GOAL");
  const { recordTransaction, ...data } = parseBody(depositBody, req);
  const date = parseDate(data.date);

  const categoryId = recordTransaction ? await savingsCategory(userId) : null;
  const note = data.note || null;
  await prisma.$transaction(async (tx) => {
    const transaction = categoryId
      ? await tx.transaction.create({
          data: { userId, type: "EXPENSE", amount: data.amount, date, categoryId, note: note ?? goal.title },
          select: { id: true },
        })
      : null;
    await tx.goalDeposit.create({ data: { goalId: goal.id, amount: data.amount, date, note, transactionId: transaction?.id } });
  });
  await syncGoalStatus(goal.id);
  res.status(201).json({ goal: await loadGoal(goal.id) });
});

goalsRouter.delete("/:id/deposits/:depositId", async (req, res) => {
  const goal = await ownedGoal(userIdOf(req), req.params.id);
  const deposit = await prisma.goalDeposit.findFirst({
    where: { id: req.params.depositId, goalId: goal.id },
    select: { id: true, transactionId: true },
  });
  if (!deposit) throw notFound();
  // Hapus juga transaksi pengeluaran yang terhubung
  await prisma.$transaction([
    prisma.goalDeposit.delete({ where: { id: deposit.id } }),
    ...(deposit.transactionId ? [prisma.transaction.delete({ where: { id: deposit.transactionId } })] : []),
  ]);
  await syncGoalStatus(goal.id);
  res.json({ goal: await loadGoal(goal.id) });
});
