import type { Request, RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { unauthorized } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Wajib login: membaca `Authorization: Bearer <token>` dan mengisi `req.userId`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw unauthorized("NO_TOKEN");

  try {
    req.userId = verifyAccessToken(token).sub;
  } catch {
    throw unauthorized("INVALID_TOKEN");
  }
  next();
};

/** Apakah request berasal dari server Next.js (membawa INTERNAL_API_SECRET yang benar)? */
export function isInternalRequest(req: Request) {
  const given = Buffer.from(String(req.headers["x-internal-secret"] ?? ""));
  const expected = Buffer.from(env.INTERNAL_API_SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Hanya untuk panggilan server-to-server dari Next.js (mis. login Google). */
export const requireInternal: RequestHandler = (req, _res, next) => {
  if (!isInternalRequest(req)) throw unauthorized("INVALID_INTERNAL_SECRET");
  next();
};

/** Ambil userId yang sudah dipastikan ada oleh requireAuth. */
export function userIdOf(req: Request) {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
