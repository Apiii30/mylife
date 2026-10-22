import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const select = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  hasDueTime: true,
  priority: true,
  status: true,
  position: true,
  completedAt: true,
  createdAt: true,
  category: { select: { id: true, name: true, color: true, icon: true } },
} satisfies Prisma.TaskSelect;

const status = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const priority = z.enum(["LOW", "MEDIUM", "HIGH"]);

/** Tugas selesai yang masih ditampilkan (lebih lama dari ini diarsipkan dari daftar). */
const DONE_WINDOW_DAYS = 30;

tasksRouter.get("/", async (req, res) => {
  const query = parseQuery(z.object({ q: z.string().trim().max(100).optional() }), req);
  const doneSince = new Date(Date.now() - DONE_WINDOW_DAYS * 86_400_000);

  const tasks = await prisma.task.findMany({
    where: {
      userId: userIdOf(req),
      OR: [{ status: { not: "DONE" } }, { completedAt: { gte: doneSince } }],
      ...(query.q && { title: { contains: query.q, mode: "insensitive" } }),
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: 1000,
    select,
  });
  res.json({ tasks });
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
  hasDueTime: z.boolean().optional(),
  priority: priority.optional(),
  status: status.optional(),
  categoryId: z.string().nullable().optional(),
});

async function assertCategory(userId: string, categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId, kind: "TASK" }, select: { id: true } });
  if (!category) throw badRequest("INVALID_CATEGORY");
}

/** completedAt mengikuti status: diisi saat menjadi DONE, dikosongkan saat dibuka lagi. */
const completion = (next: string | undefined, prevCompletedAt: Date | null = null) =>
  next === undefined ? {} : { completedAt: next === "DONE" ? (prevCompletedAt ?? new Date()) : null };

tasksRouter.post("/", async (req, res) => {
  const userId = userIdOf(req);
  const data = parseBody(bodySchema, req);
  await assertCategory(userId, data.categoryId);

  // Tugas baru muncul paling atas di kolomnya
  const first = await prisma.task.findFirst({
    where: { userId, status: data.status ?? "TODO" },
    orderBy: { position: "asc" },
    select: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      ...data,
      ...completion(data.status),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      position: (first?.position ?? 0) - 1,
      userId,
    },
    select,
  });
  res.status(201).json({ task });
});

tasksRouter.patch("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const data = parseBody(bodySchema.partial(), req);
  const existing = await prisma.task.findFirst({
    where: { id: req.params.id, userId },
    select: { status: true, completedAt: true },
  });
  if (!existing) throw notFound();
  await assertCategory(userId, data.categoryId);

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.status !== existing.status && completion(data.status, existing.completedAt)),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
    select,
  });
  res.json({ task });
});

/** Simpan urutan & status hasil drag-and-drop papan Kanban. */
const orderSchema = z.object({
  items: z.array(z.object({ id: z.string(), status, position: z.number().int() })).min(1).max(500),
});

tasksRouter.put("/order", async (req, res) => {
  const userId = userIdOf(req);
  const { items } = parseBody(orderSchema, req);

  const existing = await prisma.task.findMany({
    where: { userId, id: { in: items.map((i) => i.id) } },
    select: { id: true, status: true, completedAt: true },
  });
  const byId = new Map(existing.map((t) => [t.id, t]));

  await prisma.$transaction(
    items
      .filter((item) => byId.has(item.id))
      .map((item) => {
        const prev = byId.get(item.id)!;
        return prisma.task.update({
          where: { id: item.id },
          data: {
            status: item.status,
            position: item.position,
            ...(item.status !== prev.status && completion(item.status, prev.completedAt)),
          },
        });
      }),
  );
  res.status(204).end();
});

tasksRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.task.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
