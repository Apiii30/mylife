import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { dateSchema, formatDate, parseDate } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const COLORS = ["blue", "orange", "teal", "yellow", "pink", "green", "purple", "red"] as const;
const DAY = 86_400_000;

const select = {
  id: true,
  title: true,
  description: true,
  location: true,
  startAt: true,
  endAt: true,
  allDay: true,
  repeat: true,
  color: true,
} satisfies Prisma.EventSelect;

type EventRow = Prisma.EventGetPayload<{ select: typeof select }>;

/** Acara seharian dikirim sebagai tanggal "YYYY-MM-DD", acara berjam sebagai ISO. */
function serialize({ startAt, endAt, ...event }: EventRow) {
  return {
    ...event,
    start: event.allDay ? formatDate(startAt) : startAt.toISOString(),
    end: event.allDay ? formatDate(endAt) : endAt.toISOString(),
  };
}

eventsRouter.get("/", async (req, res) => {
  const query = parseQuery(z.object({ from: dateSchema, to: dateSchema }), req);
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (to <= from || to.getTime() - from.getTime() > 400 * DAY) throw badRequest("INVALID_RANGE");

  // Server tidak tahu zona waktu perangkat: rentang dilebarkan sehari, klien yang memotong presisi
  const before = new Date(to.getTime() + DAY);
  const after = new Date(from.getTime() - DAY);

  const events = await prisma.event.findMany({
    where: {
      userId: userIdOf(req),
      startAt: { lt: before },
      OR: [{ repeat: { not: "NONE" } }, { endAt: { gte: after } }],
    },
    orderBy: { startAt: "asc" },
    take: 2000,
    select,
  });
  res.json({ events: events.map(serialize) });
});

const bodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    allDay: z.boolean(),
    start: z.string(),
    end: z.string(),
    repeat: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("NONE"),
    color: z.enum(COLORS).default("blue"),
  })
  .superRefine((body, ctx) => {
    const format = body.allDay ? dateSchema : z.iso.datetime({ offset: true });
    for (const key of ["start", "end"] as const) {
      if (!format.safeParse(body[key]).success) ctx.addIssue({ code: "custom", path: [key], message: "Invalid date" });
    }
  });

function toData({ start, end, ...body }: z.infer<typeof bodySchema>) {
  const startAt = body.allDay ? parseDate(start) : new Date(start);
  const endAt = body.allDay ? parseDate(end) : new Date(end);
  if (endAt < startAt) throw badRequest("END_BEFORE_START");
  return { ...body, startAt, endAt };
}

eventsRouter.post("/", async (req, res) => {
  const data = toData(parseBody(bodySchema, req));
  const event = await prisma.event.create({ data: { ...data, userId: userIdOf(req) }, select });
  res.status(201).json({ event: serialize(event) });
});

eventsRouter.patch("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const data = toData(parseBody(bodySchema, req));
  const existing = await prisma.event.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!existing) throw notFound();

  const event = await prisma.event.update({ where: { id: existing.id }, data, select });
  res.json({ event: serialize(event) });
});

eventsRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.event.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
