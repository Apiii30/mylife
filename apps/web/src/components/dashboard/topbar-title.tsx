"use client";

import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { MODULES, SETTINGS_MODULE } from "@/config/modules";

const PERIODS = {
  morning: { icon: Sunrise, color: "var(--c-yellow)" },
  afternoon: { icon: Sun, color: "var(--c-journal)" },
  evening: { icon: Sunset, color: "var(--c-calendar)" },
  night: { icon: Moon, color: "var(--accent)" },
};

function period(hour: number): keyof typeof PERIODS {
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "afternoon";
  if (hour >= 15 && hour < 18) return "evening";
  return "night";
}

/** Modul dengan href terpanjang yang cocok dengan path (mis. /dashboard/journal/abc → journal). */
const moduleOf = (path: string) =>
  [...MODULES, SETTINGS_MODULE].filter((m) => path === m.href || path.startsWith(`${m.href}/`)).sort((a, b) => b.href.length - a.href.length)[0] ?? MODULES[0];

const enter = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
  transition: { duration: 0.45, ease: EASE_OUT_EXPO },
};

/** Sisi kiri top bar: sapaan di Ringkasan, nama halaman di modul lain. */
export function TopbarTitle({ name }: { name: string }) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const mod = moduleOf(usePathname());
  const hour = Number(format.dateTime(now, { hour: "numeric", hourCycle: "h23" }));
  const p = period(hour);
  const date = format.dateTime(now, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        {mod.key === "overview" ? (
          <motion.div key="greeting" {...enter} className="flex min-w-0 items-center gap-3 pl-1.5">
            <ModuleIcon icon={PERIODS[p].icon} color={PERIODS[p].color} className="hidden sm:grid" />
            <div className="min-w-0">
              <h1 className="truncate text-[16px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                {t(`greeting.${p}`)}, {name.split(" ")[0]}
              </h1>
              <p className="truncate text-[12px] leading-tight text-muted">
                <span className="capitalize">{date}</span>
                <span className="hidden xl:inline"> · {t("overview.subtitle")}</span>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key={mod.key} {...enter} className="flex min-w-0 items-center">
            <Link href="/dashboard" className="px-2 lg:hidden" aria-label="MyLife">
              <Logo />
            </Link>
            <Link href={mod.href} className="hidden min-w-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1.5 transition-colors hover:bg-ink/4 lg:flex">
              <ModuleIcon icon={mod.icon} color={mod.color} size="sm" />
              <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{t(`nav.${mod.key}`)}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
