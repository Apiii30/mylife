import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { assertCloudinary, deliveryUrl, destroyImages, signUpload, uploadEndpoint, userFolder, verifyUpload } from "../../lib/cloudinary.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";

export const photosRouter = Router();
photosRouter.use(requireAuth);

export const photoSelect = {
  id: true,
  url: true,
  width: true,
  height: true,
  caption: true,
  takenAt: true,
  createdAt: true,
  albumId: true,
} satisfies Prisma.PhotoSelect;

/** Batasi permintaan tanda tangan upload per user (kuota Cloudinary gratis terbatas). */
const signLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => userIdOf(req),
});

async function assertAlbum(userId: string, albumId: string | null | undefined) {
  if (!albumId) return;
  const album = await prisma.album.findFirst({ where: { id: albumId, userId }, select: { id: true } });
  if (!album) throw badRequest("INVALID_ALBUM");
}

// ─── Upload ────────────────────────────────────────────────

photosRouter.post("/sign", signLimiter, (req, res) => {
  assertCloudinary();
  const { count } = parseBody(z.object({ count: z.number().int().min(1).max(20) }), req);
  const userId = userIdOf(req);
  res.json({
    endpoint: uploadEndpoint(),
    apiKey: env.CLOUDINARY_API_KEY,
    uploads: Array.from({ length: count }, () => signUpload(userId)),
  });
});

const createSchema = z.object({
  publicId: z.string().max(200),
  version: z.number().int().positive(),
  signature: z.string().max(100),
  format: z.string().regex(/^[a-z0-9]{2,5}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  takenAt: z.iso.datetime({ offset: true }).nullable().optional(),
  caption: z.string().trim().max(500).nullable().optional(),
  albumId: z.string().nullable().optional(),
});

/** Catat foto yang baru diunggah browser. Tanda tangan & folder diverifikasi agar tak bisa memalsukan file. */
photosRouter.post("/", async (req, res) => {
  assertCloudinary();
  const userId = userIdOf(req);
  const body = parseBody(createSchema, req);
  if (!body.publicId.startsWith(`${userFolder(userId)}/`) || !verifyUpload(body.publicId, body.version, body.signature)) {
    throw badRequest("INVALID_UPLOAD");
  }
  await assertAlbum(userId, body.albumId);

  const photo = await prisma.photo.create({
    data: {
      userId,
      publicId: body.publicId,
      url: deliveryUrl(body.publicId, body.version, body.format),
      width: body.width,
      height: body.height,
      caption: body.caption || null,
      albumId: body.albumId ?? null,
      // Tanpa EXIF, waktu unggah dipakai sebagai tanggal foto
      takenAt: body.takenAt ? new Date(body.takenAt) : new Date(),
    },
    select: photoSelect,
  });
  res.status(201).json({ photo });
});

// ─── Daftar ────────────────────────────────────────────────

photosRouter.get("/", async (req, res) => {
  const userId = userIdOf(req);
  const query = parseQuery(
    z.object({
      albumId: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(60),
    }),
    req,
  );
  const where = { userId, ...(query.albumId && { albumId: query.albumId }) };

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: [{ takenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      select: photoSelect,
    }),
    query.cursor ? Promise.resolve(null) : prisma.photo.count({ where }),
  ]);

  const hasMore = photos.length > query.limit;
  const page = photos.slice(0, query.limit);
  res.json({ photos: page, nextCursor: hasMore ? page[page.length - 1].id : null, total });
});

// ─── Ubah & hapus ──────────────────────────────────────────

photosRouter.patch("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const data = parseBody(
    z.object({ caption: z.string().trim().max(500).nullable().optional(), albumId: z.string().nullable().optional() }),
    req,
  );
  await assertAlbum(userId, data.albumId);
  const { count } = await prisma.photo.updateMany({
    where: { id: req.params.id, userId },
    data: { ...data, ...(data.caption !== undefined && { caption: data.caption || null }) },
  });
  if (!count) throw notFound();
  res.json({ photo: await prisma.photo.findUniqueOrThrow({ where: { id: req.params.id }, select: photoSelect }) });
});

const bulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delete"), ids: z.array(z.string()).min(1).max(200) }),
  z.object({ action: z.literal("move"), ids: z.array(z.string()).min(1).max(200), albumId: z.string().nullable() }),
]);

photosRouter.post("/bulk", async (req, res) => {
  const userId = userIdOf(req);
  const body = parseBody(bulkSchema, req);
  const where = { userId, id: { in: body.ids } };

  if (body.action === "move") {
    await assertAlbum(userId, body.albumId);
    const { count } = await prisma.photo.updateMany({ where, data: { albumId: body.albumId } });
    return res.json({ count });
  }

  const photos = await prisma.photo.findMany({ where, select: { publicId: true } });
  const { count } = await prisma.photo.deleteMany({ where });
  await destroyImages(photos.map((p) => p.publicId));
  res.json({ count });
});

photosRouter.delete("/:id", async (req, res) => {
  const photo = await prisma.photo.findFirst({ where: { id: req.params.id, userId: userIdOf(req) }, select: { id: true, publicId: true } });
  if (!photo) throw notFound();
  await prisma.photo.delete({ where: { id: photo.id } });
  await destroyImages([photo.publicId]);
  res.status(204).end();
});
