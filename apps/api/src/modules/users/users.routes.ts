import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { assertCloudinary, deliveryUrl, destroyImages, userFolder, verifyUpload } from "../../lib/cloudinary.js";
import { badRequest, forbidden } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody } from "../../middleware/validate.js";
import { publicUserSelect } from "./users.service.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

async function loadMe(userId: string) {
  const { passwordHash, ...user } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { ...publicUserSelect, passwordHash: true },
  });
  // Akun Google tanpa password bisa membuat password baru tanpa memasukkan yang lama
  return { ...user, hasPassword: Boolean(passwordHash) };
}

usersRouter.get("/me", async (req, res) => {
  res.json({ user: await loadMe(userIdOf(req)) });
});

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "AUD", "GBP"] as const;

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  currency: z.enum(CURRENCIES).optional(),
  locale: z.enum(["id", "en"]).optional(),
  gradeScale: z.enum(["LETTER_AB", "PLUS_MINUS"]).optional(),
  notificationsSeenAt: z.iso.datetime({ offset: true }).optional(),
});

usersRouter.patch("/me", async (req, res) => {
  const userId = userIdOf(req);
  const { notificationsSeenAt, ...data } = parseBody(updateMeSchema, req);
  await prisma.user.update({
    where: { id: userId },
    data: { ...data, ...(notificationsSeenAt && { notificationsSeenAt: new Date(notificationsSeenAt) }) },
  });
  res.json({ user: await loadMe(userId) });
});

// ─── Password ──────────────────────────────────────────────

const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, keyGenerator: (req) => userIdOf(req), standardHeaders: "draft-8", legacyHeaders: false });

usersRouter.post("/me/password", passwordLimiter, async (req, res) => {
  const userId = userIdOf(req);
  const { current, next } = parseBody(z.object({ current: z.string().max(72).optional(), next: z.string().min(8).max(72) }), req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });

  // 403, bukan 401: klien menganggap 401 sebagai sesi kedaluwarsa dan akan logout
  if (user.passwordHash && !(current && (await bcrypt.compare(current, user.passwordHash)))) {
    throw forbidden("WRONG_PASSWORD");
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  res.status(204).end();
});

// ─── Foto profil ───────────────────────────────────────────

/** public_id dari URL Cloudinary milik user (untuk menghapus avatar lama). */
const publicIdOf = (url: string | null, userId: string) => {
  const match = url?.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.\w+$/);
  return match && match[1].startsWith(`${userFolder(userId)}/`) ? match[1] : null;
};

usersRouter.post("/me/avatar", async (req, res) => {
  assertCloudinary();
  const userId = userIdOf(req);
  const body = parseBody(
    z.object({ publicId: z.string().max(200), version: z.number().int().positive(), signature: z.string().max(100), format: z.string().regex(/^[a-z0-9]{2,5}$/) }),
    req,
  );
  if (!body.publicId.startsWith(`${userFolder(userId)}/`) || !verifyUpload(body.publicId, body.version, body.signature)) {
    throw badRequest("INVALID_UPLOAD");
  }
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: deliveryUrl(body.publicId, body.version, body.format) } });
  const old = publicIdOf(previous.image, userId);
  if (old) await destroyImages([old]);
  res.json({ user: await loadMe(userId) });
});

usersRouter.delete("/me/avatar", async (req, res) => {
  const userId = userIdOf(req);
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { image: true } });
  await prisma.user.update({ where: { id: userId }, data: { image: null } });
  const old = publicIdOf(previous.image, userId);
  if (old) await destroyImages([old]);
  res.json({ user: await loadMe(userId) });
});

// ─── Data & akun ───────────────────────────────────────────

/** Unduh semua data milik user dalam satu file JSON. */
usersRouter.get("/me/export", async (req, res) => {
  const userId = userIdOf(req);
  const where = { userId };
  const [user, categories, transactions, tasks, events, journals, albums, photos, goals, semesters] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUserSelect }),
    prisma.category.findMany({ where }),
    prisma.transaction.findMany({ where, orderBy: { date: "asc" } }),
    prisma.task.findMany({ where }),
    prisma.event.findMany({ where }),
    prisma.journal.findMany({ where, orderBy: { date: "asc" } }),
    prisma.album.findMany({ where }),
    prisma.photo.findMany({ where }),
    prisma.goal.findMany({ where, include: { milestones: true, deposits: true } }),
    prisma.semester.findMany({ where, include: { courses: true }, orderBy: { number: "asc" } }),
  ]);
  res.setHeader("Content-Disposition", `attachment; filename="mylife-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), user, categories, transactions, tasks, events, journals, albums, photos, goals, semesters });
});

/** Hapus akun permanen — konfirmasi dengan mengetik email. Foto di Cloudinary ikut dihapus. */
usersRouter.delete("/me", async (req, res) => {
  const userId = userIdOf(req);
  const { email } = parseBody(z.object({ email: z.string().trim().toLowerCase() }), req);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, image: true } });
  if (email !== user.email) throw badRequest("EMAIL_MISMATCH");

  const photos = await prisma.photo.findMany({ where: { userId }, select: { publicId: true } });
  await prisma.user.delete({ where: { id: userId } });
  const avatar = publicIdOf(user.image, userId);
  await destroyImages([...photos.map((p) => p.publicId), ...(avatar ? [avatar] : [])]);
  res.status(204).end();
});
