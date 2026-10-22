import {
  CalendarDays,
  GraduationCap,
  Images,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  Settings,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey = "overview" | "finance" | "tasks" | "calendar" | "journal" | "gallery" | "goals" | "grades" | "settings";

export type ModuleDef = { key: ModuleKey; href: string; icon: LucideIcon; color: string };

/** Satu sumber kebenaran untuk navigasi, ikon, dan warna tiap modul. */
export const MODULES: ModuleDef[] = [
  { key: "overview", href: "/dashboard", icon: LayoutGrid, color: "var(--c-teal)" },
  { key: "finance", href: "/dashboard/finance", icon: Wallet, color: "var(--c-finance)" },
  { key: "tasks", href: "/dashboard/tasks", icon: ListChecks, color: "var(--c-tasks)" },
  { key: "calendar", href: "/dashboard/calendar", icon: CalendarDays, color: "var(--c-calendar)" },
  { key: "journal", href: "/dashboard/journal", icon: NotebookPen, color: "var(--c-journal)" },
  { key: "gallery", href: "/dashboard/gallery", icon: Images, color: "var(--c-gallery)" },
  { key: "goals", href: "/dashboard/goals", icon: Target, color: "var(--c-goals)" },
  { key: "grades", href: "/dashboard/grades", icon: GraduationCap, color: "var(--c-grades)" },
];

export const SETTINGS_MODULE: ModuleDef = {
  key: "settings",
  href: "/dashboard/settings",
  icon: Settings,
  color: "var(--muted)",
};

export const moduleByKey = (key: ModuleKey) =>
  [...MODULES, SETTINGS_MODULE].find((m) => m.key === key) ?? MODULES[0];
