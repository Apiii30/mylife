import type { Locale } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export const goalSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  targetAmount: true,
  color: true,
  icon: true,
  deadline: true,
  status: true,
  completedAt: true,
  createdAt: true,
  milestones: { orderBy: { position: "asc" }, select: { id: true, title: true, done: true, doneAt: true, position: true } },
} as const;

type GoalRow = {
  id: string;
  targetAmount: { toString(): string } | null;
  deadline: Date | null;
  type: "FINANCIAL" | "LIFE";
  milestones: { done: boolean }[];
};

/** Total tabungan per goal (satu query untuk banyak goal). */
export async function savedByGoal(goalIds: string[]) {
  if (!goalIds.length) return new Map<string, number>();
  const rows = await prisma.goalDeposit.groupBy({ by: ["goalId"], where: { goalId: { in: goalIds } }, _sum: { amount: true } });
  return new Map(rows.map((r) => [r.goalId, Number(r._sum.amount ?? 0)]));
}

/** Tambahkan `saved` & `progress` (0–1) ke goal, ubah Decimal/Date ke tipe JSON. */
export function serializeGoal<T extends GoalRow>(goal: T, saved = 0) {
  const target = goal.targetAmount ? Number(goal.targetAmount) : null;
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.done).length;
  const progress = goal.type === "FINANCIAL" ? (target ? Math.min(1, saved / target) : 0) : total ? done / total : 0;
  return {
    ...goal,
    targetAmount: target,
    deadline: goal.deadline ? goal.deadline.toISOString().slice(0, 10) : null,
    saved,
    progress,
  };
}

/**
 * Status mengikuti progres: 100% → COMPLETED, turun lagi → ACTIVE.
 * Goal yang diarsipkan tidak diubah.
 */
export async function syncGoalStatus(goalId: string) {
  const goal = await prisma.goal.findUniqueOrThrow({
    where: { id: goalId },
    select: { status: true, type: true, targetAmount: true, deadline: true, id: true, milestones: { select: { done: true } } },
  });
  if (goal.status === "ARCHIVED") return;
  const saved = (await savedByGoal([goalId])).get(goalId) ?? 0;
  const { progress } = serializeGoal(goal, saved);
  const reached = progress >= 1;
  if (reached && goal.status !== "COMPLETED") {
    await prisma.goal.update({ where: { id: goalId }, data: { status: "COMPLETED", completedAt: new Date() } });
  } else if (!reached && goal.status === "COMPLETED") {
    await prisma.goal.update({ where: { id: goalId }, data: { status: "ACTIVE", completedAt: null } });
  }
}

/** Kategori pengeluaran "Tabungan" untuk setoran goal — dibuat otomatis bila belum ada. */
export async function savingsCategory(userId: string) {
  const existing = await prisma.category.findFirst({ where: { userId, kind: "EXPENSE", icon: "piggy-bank" }, select: { id: true } });
  if (existing) return existing.id;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { locale: true } });
  const name: Record<Locale, string> = { id: "Tabungan", en: "Savings" };
  const category = await prisma.category.upsert({
    where: { userId_kind_name: { userId, kind: "EXPENSE", name: name[user.locale] } },
    update: { icon: "piggy-bank" },
    create: { userId, kind: "EXPENSE", name: name[user.locale], color: "green", icon: "piggy-bank" },
    select: { id: true },
  });
  return category.id;
}
