import type { Request } from "express";
import type { z } from "zod";

/** Validasi body/query dengan Zod. ZodError ditangani oleh errorHandler. */
export const parseBody = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => schema.parse(req.body);
export const parseQuery = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => schema.parse(req.query);
