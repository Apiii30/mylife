import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { conflict, unauthorized } from "../../lib/http-error.js";
import { signAccessToken } from "../../lib/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { isInternalRequest, requireInternal } from "../../middleware/auth.js";
import { parseBody } from "../../middleware/validate.js";
import { createUser, publicUserSelect } from "../users/users.service.js";
import { loginSchema, oauthSchema, registerSchema } from "./auth.schemas.js";

export const authRouter = Router();

// Batasi percobaan login/daftar untuk mencegah brute force.
// Login dipanggil dari server NextAuth, jadi IP asli user dikirim lewat `x-client-ip`
// (hanya dipercaya jika request membawa INTERNAL_API_SECRET).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const clientIp = req.headers["x-client-ip"];
    const ip = typeof clientIp === "string" && isInternalRequest(req) ? clientIp : (req.ip ?? "unknown");
    return ipKeyGenerator(ip);
  },
});

const session = <T extends { id: string }>(user: T) => ({ user, ...signAccessToken(user.id) });

authRouter.post("/register", authLimiter, async (req, res) => {
  const { password, ...data } = parseBody(registerSchema, req);

  const exists = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw conflict("EMAIL_TAKEN");

  const user = await createUser({ ...data, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json(session(user));
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const { email, password } = parseBody(loginSchema, req);

  const user = await prisma.user.findUnique({ where: { email }, select: { ...publicUserSelect, passwordHash: true } });
  // Pesan error sengaja disamakan agar tidak membocorkan email mana yang terdaftar
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized("INVALID_CREDENTIALS");
  }

  const { passwordHash: _, ...publicUser } = user;
  res.json(session(publicUser));
});

/** Dipanggil server NextAuth setelah login Google: cari atau buat user berdasarkan email. */
authRouter.post("/oauth", requireInternal, async (req, res) => {
  const data = parseBody(oauthSchema, req);

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: publicUserSelect });
  const user =
    existing ??
    (await createUser({ name: data.name, email: data.email, image: data.image, locale: data.locale }));

  res.json(session(user));
});
