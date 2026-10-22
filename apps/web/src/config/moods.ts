import { Frown, HeartCrack, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";

export type Mood = "GREAT" | "GOOD" | "OKAY" | "BAD" | "AWFUL";

/**
 * Urutan dari paling baik ke paling buruk — warna diverging biru ↔ merah (lihat --mood-* di globals.css).
 * `ink` = warna ikon di atas latar mood (abu netral butuh ikon yang mengikuti tema).
 */
export const MOODS: { key: Mood; icon: LucideIcon; color: string; ink: string }[] = [
  { key: "GREAT", icon: Laugh, color: "var(--mood-great)", ink: "#fff" },
  { key: "GOOD", icon: Smile, color: "var(--mood-good)", ink: "#fff" },
  { key: "OKAY", icon: Meh, color: "var(--mood-okay)", ink: "var(--ink)" },
  { key: "BAD", icon: Frown, color: "var(--mood-bad)", ink: "#fff" },
  { key: "AWFUL", icon: HeartCrack, color: "var(--mood-awful)", ink: "#fff" },
];

export const moodOf = (key: Mood | null | undefined) => MOODS.find((m) => m.key === key) ?? null;

/** Kunci pertanyaan pemantik menulis (teksnya di messages → journal.prompts). */
export const JOURNAL_PROMPTS = ["grateful", "smile", "mind", "learned", "tomorrow"] as const;
