import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const kind = z.enum(["INCOME", "EXPENSE", "TASK"]);
const COLORS = ["blue", "orange", "teal", "yellow", "pink", "green", "purple", "red", "gray"] as const;

const select = { id: true, name: true, kind: true, color: true, icon: true } as const;

categoriesRouter.get("/", async (req, res) => {
  const query = parseQuery(z.object({ kind: kind.optional() }), req);
  const rows = await prisma.category.findMany({
    where: { userId: userIdOf(req), kind: query.kind },
    orderBy: { name: "asc" },
    select,
  });
  // "Lainnya / Others" (ikon ellipsis) selalu di urutan terakhir
  const categories = [...rows.filter((c) => c.icon !== "ellipsis"), ...rows.filter((c) => c.icon === "ellipsis")];
  res.json({ categories });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  kind,
  color: z.enum(COLORS).default("gray"),
  icon: z.string().max(40).default("tag"),
});

categoriesRouter.post("/", async (req, res) => {
  const data = parseBody(createSchema, req);
  const category = await prisma.category.create({ data: { ...data, userId: userIdOf(req) }, select });
  res.status(201).json({ category });
});

categoriesRouter.patch("/:id", async (req, res) => {
  // Tanpa default agar warna/ikon tidak ter-reset saat hanya mengganti nama
  const data = parseBody(createSchema.omit({ kind: true }).extend({ color: z.enum(COLORS), icon: z.string().max(40) }).partial(), req);
  const { count } = await prisma.category.updateMany({ where: { id: req.params.id, userId: userIdOf(req) }, data });
  if (!count) throw notFound();
  const category = await prisma.category.findUniqueOrThrow({ where: { id: req.params.id }, select });
  res.json({ category });
});

categoriesRouter.delete("/:id", async (req, res) => {
  // Transaksi/tugas di kategori ini tetap ada; kategorinya menjadi kosong (onDelete: SetNull)
  const { count } = await prisma.category.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
