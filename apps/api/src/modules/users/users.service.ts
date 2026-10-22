import type { Locale, Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { defaultCategories } from "./default-categories.js";

/** Field user yang aman dikirim ke client (tanpa passwordHash). */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  currency: true,
  locale: true,
  gradeScale: true,
  notificationsSeenAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash?: string;
  image?: string | null;
  locale: Locale;
}) {
  return prisma.user.create({
    data: {
      ...data,
      currency: "IDR", // default Rupiah untuk semua akun; bisa diganti di Pengaturan
      categories: { create: defaultCategories(data.locale) },
    },
    select: publicUserSelect,
  });
}
