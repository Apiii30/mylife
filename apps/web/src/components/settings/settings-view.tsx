"use client";

import { Database, Palette, Settings, ShieldCheck, Tags, UserRound, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { AccountSection, SecuritySection } from "./account";
import { CategoriesSection } from "./categories";
import { PreferencesSection } from "./preferences";
import { ProfileSection } from "./profile";

const SECTIONS: { key: "profile" | "preferences" | "categories" | "security" | "data"; icon: LucideIcon }[] = [
  { key: "profile", icon: UserRound },
  { key: "preferences", icon: Palette },
  { key: "categories", icon: Tags },
  { key: "security", icon: ShieldCheck },
  { key: "data", icon: Database },
];

export function SettingsView() {
  const t = useTranslations("settings");
  const [active, setActive] = useState<string>(SECTIONS[0].key);

  // Penanda navigasi mengikuti bagian yang sedang terlihat
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    SECTIONS.forEach(({ key }) => {
      const el = document.getElementById(key);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function jump(key: string) {
    setActive(key);
    document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <header className="flex items-center gap-4 pt-2 pb-6 sm:pt-6">
        <ModuleIcon icon={Settings} color="var(--muted)" size="lg" />
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
          <p className="text-[14px] text-muted">{t("subtitle")}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t("title")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
          {SECTIONS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => jump(key)}
              aria-current={active === key ? "true" : undefined}
              className={cn(
                "relative flex h-10 shrink-0 items-center gap-2.5 rounded-full px-4 text-[14px] font-medium transition-colors lg:rounded-[14px]",
                active === key ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {active === key && (
                <motion.span
                  layoutId="settings-nav"
                  className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(40_50_140/0.08),0_6px_16px_-8px_rgb(40_50_140/0.25)] lg:rounded-[14px]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{t(`nav.${key}`)}</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          <ProfileSection />
          <PreferencesSection />
          <CategoriesSection />
          <SecuritySection />
          <AccountSection />
        </div>
      </div>
    </>
  );
}

/** Kartu kaca untuk satu bagian pengaturan. */
export function Section({ id, title, description, children, tone }: { id: string; title: string; description?: string; children: React.ReactNode; tone?: "danger" }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className={cn("glass-card scroll-mt-24 rounded-[24px] p-4 sm:p-6", tone === "danger" && "ring-1 ring-calendar/25")}
    >
      <header className="mb-4">
        <h2 className={cn("text-[17px] font-semibold tracking-[-0.02em]", tone === "danger" ? "text-calendar" : "text-ink")}>{title}</h2>
        {description && <p className="mt-0.5 text-[14px] text-muted">{description}</p>}
      </header>
      {children}
    </motion.section>
  );
}

/** Satu baris pengaturan: label + keterangan di kiri, kontrol di kanan (bertumpuk di ponsel). */
export function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
