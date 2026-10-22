"use client";

import { Check } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Aurora } from "@/components/ui/aurora";
import { CountUp } from "@/components/ui/count-up";
import { LiquidProgress } from "@/components/ui/liquid-progress";
import { EASE_OUT_EXPO, Reveal, RevealLines } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { demoMoney } from "@/lib/format";

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function LifeGoal() {
  const t = useTranslations("landing.goals.life");
  const milestones = t("milestones").split(",");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [done, setDone] = useState(2);

  useEffect(() => {
    if (!inView) return;
    const id = setTimeout(() => setDone(3), 1600);
    return () => clearTimeout(id);
  }, [inView]);

  const progress = inView ? (done / milestones.length) * 100 : 0;

  return (
    <div ref={ref} className="flex flex-col gap-6">
      <ol className="relative flex flex-col gap-1">
        {milestones.map((m, i) => {
          const checked = i < done;
          return (
            <li key={m} className="relative flex items-center gap-4 rounded-2xl px-3 py-3">
              {i < milestones.length - 1 && (
                <span className="absolute top-[38px] left-[22px] h-[calc(100%-22px)] w-px bg-white/10">
                  <motion.span
                    className="block w-full origin-top bg-finance"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: i < done - 1 ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                    style={{ height: "100%" }}
                  />
                </span>
              )}
              <motion.span
                className="relative grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]"
                animate={{
                  backgroundColor: checked ? "var(--c-finance)" : "rgba(0,0,0,0)",
                  borderColor: checked ? "var(--c-finance)" : "rgba(255,255,255,0.25)",
                  scale: checked && i === 2 ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                {checked && <Check className="size-3 text-black" strokeWidth={3.5} />}
              </motion.span>
              <span className={cn("text-[16px] font-medium transition-colors duration-500", checked ? "text-white" : "text-white/45")}>
                {m}
              </span>
            </li>
          );
        })}
      </ol>
      <div>
        <div className="mb-2 flex justify-between text-[13px] font-medium text-white/60">
          <span>Progress</span>
          <motion.span key={done} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-white tabular-nums">
            {Math.round(progress)}%
          </motion.span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--c-teal),var(--c-finance))]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: EASE_OUT_EXPO }}
          />
        </div>
      </div>
    </div>
  );
}

export function GoalsShowcase() {
  const t = useTranslations("landing.goals");
  const money = demoMoney(useLocale());

  return (
    <section id="goals" className="dark scroll-mt-20 px-3 sm:px-4">
      <div className="relative isolate overflow-hidden rounded-[40px] bg-black px-5 py-24 text-ink sm:rounded-[56px] sm:px-10 sm:py-32">
        <Aurora intensity="soft" className="opacity-60" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="text-[15px] font-semibold text-goals">{t("eyebrow")}</p>
            </Reveal>
            <h2 className="mt-3 text-[clamp(2.4rem,5.5vw,4.25rem)] leading-[0.95] font-semibold tracking-[-0.05em]">
              <RevealLines text={t("title")} />
            </h2>
            <Reveal delay={0.2}>
              <p className="mt-6 text-[clamp(1.05rem,2vw,1.25rem)] leading-relaxed text-muted">{t("subtitle")}</p>
            </Reveal>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            <Reveal className="glass flex flex-col rounded-[32px] p-7 sm:p-9">
              <Chip color="var(--c-goals)">{t("financial.label")}</Chip>
              <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.03em]">{t("financial.title")}</h3>
              <div className="my-10 flex justify-center">
                <LiquidProgress value={68} size={208} />
              </div>
              <p className="text-[13px] font-medium text-muted">{t("financial.saved")}</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[22px] font-semibold tracking-[-0.03em] tabular-nums">
                <CountUp value={12_240_000} format={money} />
                <span className="text-[15px] font-medium whitespace-nowrap text-muted">
                  {t("financial.of")} {money(18_000_000)}
                </span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">{t("financial.desc")}</p>
            </Reveal>

            <Reveal delay={0.1} className="glass flex flex-col rounded-[32px] p-7 sm:p-9">
              <Chip color="var(--c-finance)">{t("life.label")}</Chip>
              <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.03em]">{t("life.title")}</h3>
              <div className="my-8 flex-1">
                <LifeGoal />
              </div>
              <p className="text-[15px] leading-relaxed text-muted">{t("life.desc")}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
