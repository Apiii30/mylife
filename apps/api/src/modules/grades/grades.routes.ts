import { Router } from "express";
import { z } from "zod";
import { conflict, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody } from "../../middleware/validate.js";

export const gradesRouter = Router();
gradesRouter.use(requireAuth);

/** Semua huruf mutu yang dikenal (dua skala). Bobotnya dihitung di klien — huruf tiap skala tidak bertabrakan. */
const GRADES = ["A", "A-", "AB", "B+", "B", "B-", "BC", "C+", "C", "D", "E"] as const;

const courseSelect = { id: true, name: true, code: true, credits: true, grade: true, position: true } as const;

gradesRouter.get("/", async (req, res) => {
  const userId = userIdOf(req);
  const [user, semesters] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { gradeScale: true } }),
    prisma.semester.findMany({
      where: { userId },
      orderBy: { number: "asc" },
      select: { id: true, number: true, label: true, courses: { orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: courseSelect } },
    }),
  ]);
  res.json({ scale: user.gradeScale, semesters });
});

// ─── Semester ──────────────────────────────────────────────

const semesterSchema = z.object({
  number: z.number().int().min(1).max(20),
  label: z.string().trim().max(60).nullable().optional(),
});

async function ownedSemester(userId: string, id: string) {
  const semester = await prisma.semester.findFirst({ where: { id, userId }, select: { id: true } });
  if (!semester) throw notFound();
  return semester;
}

gradesRouter.post("/semesters", async (req, res) => {
  const userId = userIdOf(req);
  const body = parseBody(semesterSchema.partial({ number: true }), req);
  // Tanpa nomor → semester berikutnya setelah yang terakhir
  const last = await prisma.semester.findFirst({ where: { userId }, orderBy: { number: "desc" }, select: { number: true } });
  const number = body.number ?? (last?.number ?? 0) + 1;
  if (await prisma.semester.findUnique({ where: { userId_number: { userId, number } }, select: { id: true } })) throw conflict("SEMESTER_EXISTS");

  const semester = await prisma.semester.create({
    data: { userId, number, label: body.label || null },
    select: { id: true, number: true, label: true, courses: { select: courseSelect } },
  });
  res.status(201).json({ semester });
});

gradesRouter.patch("/semesters/:id", async (req, res) => {
  const userId = userIdOf(req);
  const semester = await ownedSemester(userId, req.params.id);
  const body = parseBody(semesterSchema.partial(), req);
  if (body.number !== undefined) {
    const clash = await prisma.semester.findUnique({ where: { userId_number: { userId, number: body.number } }, select: { id: true } });
    if (clash && clash.id !== semester.id) throw conflict("SEMESTER_EXISTS");
  }
  await prisma.semester.update({
    where: { id: semester.id },
    data: { ...body, ...(body.label !== undefined && { label: body.label || null }) },
  });
  res.status(204).end();
});

gradesRouter.delete("/semesters/:id", async (req, res) => {
  const semester = await ownedSemester(userIdOf(req), req.params.id);
  await prisma.semester.delete({ where: { id: semester.id } });
  res.status(204).end();
});

// ─── Mata kuliah ───────────────────────────────────────────

const courseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().max(20).nullable().optional(),
  credits: z.number().int().min(1).max(24),
  grade: z.enum(GRADES),
});

gradesRouter.post("/semesters/:id/courses", async (req, res) => {
  const userId = userIdOf(req);
  const semester = await ownedSemester(userId, req.params.id);
  const body = parseBody(courseSchema, req);
  const count = await prisma.course.count({ where: { semesterId: semester.id } });
  const course = await prisma.course.create({
    data: { ...body, code: body.code || null, userId, semesterId: semester.id, position: count },
    select: courseSelect,
  });
  res.status(201).json({ course });
});

gradesRouter.patch("/courses/:id", async (req, res) => {
  const body = parseBody(courseSchema.partial(), req);
  const { count } = await prisma.course.updateMany({
    where: { id: req.params.id, userId: userIdOf(req) },
    data: { ...body, ...(body.code !== undefined && { code: body.code || null }) },
  });
  if (!count) throw notFound();
  res.json({ course: await prisma.course.findUniqueOrThrow({ where: { id: req.params.id }, select: courseSelect }) });
});

gradesRouter.delete("/courses/:id", async (req, res) => {
  const { count } = await prisma.course.deleteMany({ where: { id: req.params.id, userId: userIdOf(req) } });
  if (!count) throw notFound();
  res.status(204).end();
});
