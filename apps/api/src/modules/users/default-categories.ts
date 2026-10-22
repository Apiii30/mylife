import type { CategoryKind, Locale } from "../../generated/prisma/client.js";

type Seed = { kind: CategoryKind; color: string; icon: string; name: Record<Locale, string> };

/** Kategori awal yang dibuat otomatis untuk setiap user baru. */
const SEEDS: Seed[] = [
  { kind: "EXPENSE", color: "orange", icon: "utensils", name: { id: "Makan & Minum", en: "Food & Drinks" } },
  { kind: "EXPENSE", color: "blue", icon: "car", name: { id: "Transportasi", en: "Transport" } },
  { kind: "EXPENSE", color: "pink", icon: "shopping-bag", name: { id: "Belanja", en: "Shopping" } },
  { kind: "EXPENSE", color: "yellow", icon: "receipt", name: { id: "Tagihan", en: "Bills" } },
  { kind: "EXPENSE", color: "purple", icon: "clapperboard", name: { id: "Hiburan", en: "Entertainment" } },
  { kind: "EXPENSE", color: "teal", icon: "graduation-cap", name: { id: "Pendidikan", en: "Education" } },
  { kind: "EXPENSE", color: "red", icon: "heart-pulse", name: { id: "Kesehatan", en: "Health" } },
  { kind: "EXPENSE", color: "gray", icon: "ellipsis", name: { id: "Lainnya", en: "Others" } },
  { kind: "INCOME", color: "green", icon: "briefcase", name: { id: "Gaji", en: "Salary" } },
  { kind: "INCOME", color: "teal", icon: "wallet", name: { id: "Uang Saku", en: "Allowance" } },
  { kind: "INCOME", color: "cyan", icon: "laptop", name: { id: "Freelance", en: "Freelance" } },
  { kind: "INCOME", color: "pink", icon: "gift", name: { id: "Hadiah", en: "Gifts" } },
  { kind: "INCOME", color: "gray", icon: "ellipsis", name: { id: "Lainnya", en: "Others" } },
  { kind: "TASK", color: "blue", icon: "briefcase", name: { id: "Pekerjaan", en: "Work" } },
  { kind: "TASK", color: "indigo", icon: "graduation-cap", name: { id: "Kuliah", en: "College" } },
  { kind: "TASK", color: "green", icon: "house", name: { id: "Pribadi", en: "Personal" } },
];

export function defaultCategories(locale: Locale) {
  return SEEDS.map(({ name, ...rest }) => ({ ...rest, name: name[locale] }));
}
