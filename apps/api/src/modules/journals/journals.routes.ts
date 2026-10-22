import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { dateSchema, formatDate, monthRange, monthSchema, parseDate } from "../../lib/month.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const journalsRouter = Router();
journalsRouter.use(requireAuth);

const MOODS = ["GREAT", "GOOD", "OKAY", "BAD", "AWFUL"] as const;
const EXCERPT_LENGTH = 240;
const MAX_CONTENT_CHARS = 200_000;

const listSelect = {
  id: true,
  title: true,
  excerpt: true,
  mood: true,
  date: true,
  wordCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JournalSelect;

type ListRow = Prisma.JournalGetPayload<{ select: typeof listSelect }>;
const serialize = <T extends Pick<ListRow, "date">>(entry: T) => ({ ...entry, date: formatDate(entry.date) });

// ─── Teks polos dari dokumen Tiptap ────────────────────────

type DocNode = { type?: string; text?: string; content?: DocNode[] };

const BLOCKS = new Set(["paragraph", "heading", "blockquote", "listItem", "taskItem", "codeBlock", "horizontalRule"]);

/** Gabungkan semua teks; tiap blok (paragraf, judul, item daftar) diakhiri baris baru. */
function collectText(node: DocNode, out: string[]) {
  if (typeof node.text === "string") out.push(node.text);
  else if (node.type === "hardBreak") out.push("\n");
  else {
    for (const child of node.content ?? []) collectText(child, out);
    if (BLOCKS.has(node.type ?? "")) out.push("\n");
  }
  return out;
}

function textFields(content: DocNode) {
  const plainText = collectText(content, []).join("").replace(/\n{3,}/g, "\n\n").trim();
  const flat = plainText.replace(/\s+/g, " ");
  return {
    plainText,
    excerpt: flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…` : flat || null,
    wordCount: flat ? flat.split(" ").length : 0,
  };
}

const contentSchema = z
  .looseObject({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
  .refine((doc) => JSON.stringify(doc).length <= MAX_CONTENT_CHARS, "Content too large");

// ─── Daftar & statistik ────────────────────────────────────

journalsRouter.get("/", async (req, res) => {
  const query = parseQuery(
    z.object({
      q: z.string().trim().max(100).optional(),
      mood: z.enum(MOODS).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    }),
    req,
  );

  const entries = await prisma.journal.findMany({
    where: {
      userId: userIdOf(req),
      ...(query.mood && { mood: query.mood }),
      ...(query.q && {
        OR: [{ title: { contains: query.q, mode: "insensitive" } }, { plainText: { contains: query.q, mode: "insensitive" } }],
      }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    select: listSelect,
  });

  const hasMore = entries.length > query.limit;
  const page = entries.slice(0, query.limit);
  res.json({ entries: page.map(serialize), nextCursor: hasMore ? page[page.length - 1].id : null });
});

/** Streak menulis, jumlah entri, dan suasana hati per hari dalam satu bulan. */
journalsRouter.get("/stats", async (req, res) => {
  const userId = userIdOf(req);
  const query = parseQuery(z.object({ today: dateSchema, month: monthSchema }), req);
  const { start, end } = monthRange(query.month);

  const [days, total, words, month] = await Promise.all([
    prisma.journal.findMany({ where: { userId }, distinct: ["date"], orderBy: { date: "desc" }, select: { date: true }, take: 3660 }),
    prisma.journal.count({ where: { userId } }),
    prisma.journal.aggregate({ where: { userId }, _sum: { wordCount: true } }),
    prisma.journal.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { date: true, mood: true },
    }),
  ]);

  // Streak dihitung mundur dari hari ini (atau kemarin, kalau hari ini belum menulis)
  const written = new Set(days.map((d) => formatDate(d.date)));
  const cursor = parseDate(query.today);
  if (!written.has(query.today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (written.has(formatDate(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Satu suasana hati per hari: entri terakhir yang punya mood
  const moods = new Map<string, string>();
  for (const entry of month) if (entry.mood) moods.set(formatDate(entry.date), entry.mood);

  res.json({
    total,
    streak,
    writtenToday: written.has(query.today),
    words: words._sum.wordCount ?? 0,
    monthEntries: month.length,
    moods: Object.fromEntries(moods),
  });
});

journalsRouter.get("/:id", async (req, res) => {
  const entry = await prisma.journal.findFirst({
    where: { id: req.params.id, userId: userIdOf(req) },
    select: { ...listSelect, content: true },
  });
  if (!entry) throw notFound();
  res.json({ entry: serialize(entry) });
});

// ─── Tulis ─────────────────────────────────────────────────

const bodySchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  content: contentSchema.optional(),
  mood: z.enum(MOODS).nullable().optional(),
  date: dateSchema,
});

function toData(body: Partial<z.infer<typeof bodySchema>>) {
  const { content, date, title, ...rest } = body;
  return {
    ...rest,
    ...(title !== undefined && { title: title || null }),
    ...(date && { date: parseDate(date) }),
    ...(content && { content: content as Prisma.InputJsonValue, ...textFields(content as DocNode) }),
  };
}

journalsRouter.post("/", async (req, res) => {
  const body = parseBody(bodySchema, req);
  const entry = await prisma.journal.create({
    data: { ...toData(body), date: parseDate(body.date), userId: userIdOf(req) },
    select: listSelect,
  });
  res.status(201).json({ entry: serialize(entry) });
});

journalsRouter.patch("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const body = parseBody(bodySchema.partial(), req);
  if (!Object.keys(body).length) throw badRequest("EMPTY_UPDATE");
  const existing = await prisma.journal.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!existing) throw notFound();

  const entry = await prisma.journal.update({ where: { id: existing.id }, data: toData(body), select: listSelect });
  res.json({ entry: serialize(entry) });
});

journalsRouter.delete("/:id", async (req, res) => {
  const { count } = await prisma.journal.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
