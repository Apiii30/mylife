import { Router } from "express";
import { z } from "zod";
import { formatDate } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseQuery } from "../../middleware/validate.js";

export const searchRouter = Router();
searchRouter.use(requireAuth);

const PER_TYPE = 5;

/** Pencarian global untuk command palette: beberapa hasil teratas dari tiap modul. */
searchRouter.get("/", async (req, res) => {
  const userId = userIdOf(req);
  const { q } = parseQuery(z.object({ q: z.string().trim().min(2).max(100) }), req);
  const contains = { contains: q, mode: "insensitive" as const };
  const take = PER_TYPE;

  const [tasks, events, journals, goals, transactions, photos, albums, courses] = await Promise.all([
    prisma.task.findMany({
      where: { userId, OR: [{ title: contains }, { description: contains }] },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, title: true, status: true, dueDate: true },
    }),
    prisma.event.findMany({
      where: { userId, OR: [{ title: contains }, { location: contains }, { description: contains }] },
      orderBy: { startAt: "desc" },
      take,
      select: { id: true, title: true, startAt: true, allDay: true, location: true },
    }),
    prisma.journal.findMany({
      where: { userId, OR: [{ title: contains }, { plainText: contains }] },
      orderBy: { date: "desc" },
      take,
      select: { id: true, title: true, excerpt: true, date: true },
    }),
    prisma.goal.findMany({ where: { userId, title: contains }, take, select: { id: true, title: true, status: true } }),
    prisma.transaction.findMany({
      where: { userId, OR: [{ note: contains }, { category: { name: contains } }] },
      orderBy: { date: "desc" },
      take,
      select: { id: true, note: true, amount: true, type: true, date: true, category: { select: { name: true } } },
    }),
    prisma.photo.findMany({ where: { userId, caption: contains }, orderBy: { takenAt: "desc" }, take, select: { id: true, caption: true, url: true } }),
    prisma.album.findMany({ where: { userId, name: contains }, take, select: { id: true, name: true } }),
    prisma.course.findMany({
      where: { userId, OR: [{ name: contains }, { code: contains }] },
      take,
      select: { id: true, name: true, grade: true, credits: true, semester: { select: { id: true, number: true } } },
    }),
  ]);

  res.json({
    tasks,
    events: events.map((e) => ({ ...e, date: e.allDay ? formatDate(e.startAt) : e.startAt.toISOString() })),
    journals: journals.map((j) => ({ ...j, date: formatDate(j.date) })),
    goals,
    transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount), date: formatDate(t.date) })),
    photos,
    albums,
    courses,
  });
});
