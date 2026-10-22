import { z } from "zod";

const email = z.email().trim().toLowerCase();
const locale = z.enum(["id", "en"]).default("id");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email,
  password: z.string().min(8).max(72), // bcrypt hanya membaca 72 byte pertama
  locale,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const oauthSchema = z.object({
  email,
  name: z.string().trim().min(1).max(60),
  image: z.url().nullish(),
  locale,
});
