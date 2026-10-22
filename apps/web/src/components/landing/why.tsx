"use client";

import { Languages, MonitorSmartphone, ShieldCheck, SunMoon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/reveal";

const ITEMS = [
  { key: "lang", icon: Languages, color: "var(--c-tasks)" },
  { key: "theme", icon: SunMoon, color: "var(--c-journal)" },
  { key: "devices", icon: MonitorSmartphone, color: "var(--c-gallery)" },
  { key: "private", icon: ShieldCheck, color: "var(--c-finance)" },
] as const;

export function Why() {
  const t = useTranslations("landing.why");

  return (
    <section id="why" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <Reveal>
        <h2 className="max-w-xl text-[clamp(2rem,5vw,3.5rem)] leading-[1] font-semibold tracking-[-0.045em] text-balance text-ink">
          {t("title")}
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ key, icon: Icon, color }, i) => (
          <Reveal key={key} delay={i * 0.08} className="border-t border-line pt-6">
            <Icon className="size-7" style={{ color }} strokeWidth={1.8} />
            <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-ink">{t(`items.${key}.title`)}</h3>
            <p className="mt-1 text-[15px] text-muted">{t(`items.${key}.desc`)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
