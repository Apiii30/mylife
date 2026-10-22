import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client.js";
import { destroyImages } from "../../lib/cloudinary.js";
import { notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, userIdOf } from "../../middleware/auth.js";
import { parseBody, parseQuery } from "../../middleware/validate.js";
import { photoSelect } from "./photos.routes.js";

export const albumsRouter = Router();
albumsRouter.use(requireAuth);

const COVER_PHOTOS = 3; // tumpukan foto di kartu album

const albumSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  _count: { select: { photos: true } },
  photos: {
    orderBy: [{ takenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: COVER_PHOTOS,
    select: photoSelect,
  },
} satisfies Prisma.AlbumSelect;

type AlbumRow = Prisma.AlbumGetPayload<{ select: typeof albumSelect }>;
const serialize = ({ _count, photos, ...album }: AlbumRow) => ({ ...album, count: _count.photos, cover: photos });

albumsRouter.get("/", async (req, res) => {
  const albums = await prisma.album.findMany({ where: { userId: userIdOf(req) }, orderBy: { updatedAt: "desc" }, select: albumSelect });
  res.json({ albums: albums.map(serialize) });
});

const bodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).nullable().optional(),
});

albumsRouter.post("/", async (req, res) => {
  const data = parseBody(bodySchema, req);
  const album = await prisma.album.create({ data: { ...data, userId: userIdOf(req) }, select: albumSelect });
  res.status(201).json({ album: serialize(album) });
});

albumsRouter.patch("/:id", async (req, res) => {
  const data = parseBody(bodySchema.partial(), req);
  const { count } = await prisma.album.updateMany({ where: { id: req.params.id, userId: userIdOf(req) }, data });
  if (!count) throw notFound();
  res.json({ album: serialize(await prisma.album.findUniqueOrThrow({ where: { id: req.params.id }, select: albumSelect })) });
});

/** Hapus album; foto di dalamnya tetap ada kecuali `?withPhotos=true`. */
albumsRouter.delete("/:id", async (req, res) => {
  const userId = userIdOf(req);
  const { withPhotos } = parseQuery(z.object({ withPhotos: z.enum(["true", "false"]).optional() }), req);
  const album = await prisma.album.findFirst({ where: { id: req.params.id, userId }, select: { id: true } });
  if (!album) throw notFound();

  if (withPhotos === "true") {
    const photos = await prisma.photo.findMany({ where: { albumId: album.id, userId }, select: { publicId: true } });
    await prisma.photo.deleteMany({ where: { albumId: album.id, userId } });
    await destroyImages(photos.map((p) => p.publicId));
  }
  await prisma.album.delete({ where: { id: album.id } });
  res.status(204).end();
});
