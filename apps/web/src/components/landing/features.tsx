"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO, Reveal, RevealLines } from "@/components/ui/reveal";
import { moduleByKey, type ModuleKey } from "@/config/modules";
import { cn } from "@/lib/cn";
import {
  CalendarVisual,
  FinanceVisual,
  GalleryVisual,
  GoalsVisual,
  GradesVisual,
  JournalVisual,
  TasksVisual,
} from "./feature-visuals";

type FeatureKey = Exclude<ModuleKey, "overview" | "settings">;

const CARDS: { key: FeatureKey; className: string; visual: React.ReactNode }[] = [
  { key: "finance", className: "md:col-span-2 lg:col-span-4", visual: <FinanceVisual /> },
  { key: "tasks", className: "lg:col-span-2", visual: <TasksVisual /> },
  { key: "calendar", className: "lg:col-span-2", visual: <CalendarVisual /> },
  { key: "journal", className: "lg:col-span-2", visual: <JournalVisual /> },
  { key: "goals", className: "md:col-span-2 lg:col-span-2", visual: <GoalsVisual /> },
  { key: "gallery", className: "md:col-span-2 lg:col-span-4", visual: <GalleryVisual /> },
  { key: "grades", className: "md:col-span-2 lg:col-span-2", visual: <GradesVisual /> },
];

function FeatureCard({ id, className, index, children }: { id: FeatureKey; className: string; index: number; children: React.ReactNode }) {
  const t = useTranslations("landing.features");
  const mod = moduleByKey(id);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Parallax di dalam kartu: visual bergeser lebih lambat dari kartunya
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const visualY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [36, -36]);

  // Sorotan cahaya mengikuti kursor
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <motion.article
      ref={ref}
      onPointerMove={onMove}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: (index % 3) * 0.08 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[32px] glass-card p-6 sm:p-8 md:min-h-[340px]",
        "transition-[box-shadow,translate] duration-700 ease-out-expo hover:-translate-y-1 hover:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ${mod.color} 13%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative flex items-start gap-3">
        <ModuleIcon icon={mod.icon} color={mod.color} />
        <div className="max-w-sm">
          <h3 className="text-[19px] font-semibold tracking-[-0.025em] text-ink">{t(`${id}.title`)}</h3>
          <p className="mt-1 text-[15px] leading-snug text-muted">{t(`${id}.desc`)}</p>
        </div>
      </div>
      <motion.div style={{ y: visualY }} className="relative mt-6 flex-1 sm:mt-8">
        {children}
      </motion.div>
    </motion.article>
  );
}

export function Features() {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mb-14 max-w-2xl sm:mb-20">
        <Reveal>
          <p className="text-[15px] font-semibold text-accent">{t("eyebrow")}</p>
        </Reveal>
        <h2 className="mt-3 text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-ink">
          <RevealLines text={t("title")} delay={0.05} />
        </h2>
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-lg text-[clamp(1.05rem,2vw,1.25rem)] leading-relaxed text-muted">{t("subtitle")}</p>
        </Reveal>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {CARDS.map((card, i) => (
          <FeatureCard key={card.key} id={card.key} className={card.className} index={i}>
            {card.visual}
          </FeatureCard>
        ))}
      </div>
    </section>
  );
}
