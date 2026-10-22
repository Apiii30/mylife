"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/cn";

/** Saklar ID / EN dengan indikator yang "meluncur" di antara pilihan. */
export function LocaleToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const layoutId = useId();

  function change(locale: string) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={cn("relative flex h-9 items-center rounded-full p-1 text-[12px] font-semibold", pending && "opacity-60", className)}
    >
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => change(locale)}
            className={cn(
              "relative h-7 w-9 rounded-full uppercase tracking-wide transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{locale}</span>
          </button>
        );
      })}
    </div>
  );
}
