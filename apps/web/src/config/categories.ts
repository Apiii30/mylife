import {
  Briefcase,
  Car,
  Clapperboard,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  clapperboard: Clapperboard,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  ellipsis: Ellipsis,
  briefcase: Briefcase,
  wallet: Wallet,
  laptop: Laptop,
  gift: Gift,
  house: House,
  tag: Tag,
  "piggy-bank": PiggyBank,
};

export const categoryIcon = (icon?: string | null) => CATEGORY_ICONS[icon ?? ""] ?? Tag;

/**
 * Nama warna kategori → slot palet grafik. Urutan slot = urutan palet yang lolos
 * validasi buta warna (adjacent ΔE ≥ 8), jadi potongan donut diurutkan berdasarkan slot.
 */
export const CATEGORY_COLORS = ["blue", "orange", "teal", "yellow", "pink", "green", "purple", "red", "gray"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

const SLOT: Record<string, number> = { blue: 1, orange: 2, teal: 3, cyan: 3, yellow: 4, pink: 5, green: 6, purple: 7, indigo: 7, red: 8 };

export const colorSlot = (color?: string | null) => SLOT[color ?? ""] ?? 99;
export const categoryColor = (color?: string | null) => {
  const slot = SLOT[color ?? ""];
  return slot ? `var(--viz-${slot})` : "var(--viz-other)";
};
