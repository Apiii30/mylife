"use client";

import { Check, MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRef } from "react";
import { LiquidProgress } from "@/components/ui/liquid-progress";
import { Logo } from "@/components/ui/logo";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { MODULES } from "@/config/modules";
import { cn } from "@/lib/cn";
import { demoMoney } from "@/lib/format";

const CHART = [32, 41, 36, 52, 47, 61, 58, 72, 66, 81, 77, 92];

function chartPath(width: number, height: number) {
  const step = width / (CHART.length - 1);
  const pts = CHART.map((v, i) => [i * step, height - (v / 100) * height] as const);
  // Kurva halus (Catmull-Rom → Bézier)
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  return d;
}

function Card({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 1.2 + delay }}
      className={cn("rounded-[20px] glass-card p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5", className)}
    >
      {children}
    </motion.div>
  );
}

export function DashboardPreview() {
  const t = useTranslations("landing.preview");
  const tNav = useTranslations("dashboard.nav");
  const money = demoMoney(useLocale());
  const format = useFormatter();
  const ref = useRef<HTMLDivElement>(null);

  // Miring 3D di awal, lalu rebah menjadi datar saat di-scroll
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const rotateX = useTransform(progress, [0, 1], [24, 0]);
  const scale = useTransform(progress, [0, 1], [0.9, 1]);
  const y = useTransform(progress, [0, 1], [40, 0]);

  const linePath = chartPath(300, 80);
  const tasks = [
    { label: t("task1"), done: true, color: "var(--c-tasks)" },
    { label: t("task2"), done: false, color: "var(--c-journal)" },
    { label: t("task3"), done: false, color: "var(--c-finance)" },
  ];

  return (
    <div ref={ref} className="relative mx-auto mt-16 max-w-6xl px-3 pb-10 [perspective:1600px] sm:mt-20 sm:px-6">
      {/* Cahaya di bawah perangkat */}
      <div
        aria-hidden
        className="absolute inset-x-[10%] top-[20%] bottom-0 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--c-tasks)_35%,transparent),transparent)] blur-2xl"
      />
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.6, ease: EASE_OUT_EXPO, delay: 0.9 }}
      >
        <motion.div style={{ rotateX, scale, y }} className="origin-top will-change-transform">
          <div className="glass rounded-[30px] p-1.5 sm:rounded-[36px] sm:p-2.5">
            <div className="flex overflow-hidden rounded-[24px] bg-canvas text-left ring-1 ring-line sm:rounded-[28px]">
              {/* Sidebar mini */}
              <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface-2/60 p-4 lg:flex">
                <Logo className="mb-5 px-2" />
                {MODULES.map((m, i) => (
                  <div
                    key={m.key}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] font-medium",
                      i === 0 ? "bg-ink/6 text-ink" : "text-ink-2",
                    )}
                  >
                    <ModuleIcon icon={m.icon} color={m.color} size="sm" />
                    {tNav(m.key)}
                  </div>
                ))}
              </aside>

              <div className="min-w-0 flex-1 p-4 sm:p-7">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[12px] font-medium tracking-wide text-muted uppercase">{t("date")}</p>
                    <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
                      {t("greeting")}
                    </p>
                  </div>
                  <div className="size-9 rounded-full bg-[conic-gradient(from_200deg,var(--c-gallery),var(--c-journal),var(--c-goals),var(--c-gallery))] ring-2 ring-surface" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-4">
                  {/* Saldo */}
                  <Card className="col-span-2 overflow-hidden">
                    <p className="text-[12px] font-medium text-muted">{t("balance")}</p>
                    <p className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-ink tabular-nums sm:text-[32px]">
                      {money(4_250_000)}
                    </p>
                    <div className="mt-1 flex gap-4 text-[12px] font-medium">
                      <span className="flex items-center gap-1 text-finance">
                        <TrendingUp className="size-3.5" /> {t("income")} {money(7_500_000)}
                      </span>
                      <span className="flex items-center gap-1 text-calendar">
                        <TrendingDown className="size-3.5" /> {t("expense")} {money(3_250_000)}
                      </span>
                    </div>
                    <svg viewBox="0 0 300 90" className="-mx-1 mt-3 h-20 w-[calc(100%+0.5rem)]" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="preview-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--c-finance)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--c-finance)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <motion.path
                        d={`${linePath} L 300 90 L 0 90 Z`}
                        fill="url(#preview-area)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2, duration: 1 }}
                      />
                      <motion.path
                        d={linePath}
                        fill="none"
                        stroke="var(--c-finance)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.5, duration: 1.8, ease: EASE_OUT_EXPO }}
                      />
                    </svg>
                  </Card>

                  {/* Goal */}
                  <Card delay={0.1} className="flex flex-col items-center justify-center gap-2">
                    <LiquidProgress value={68} size={104} />
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-ink">{t("goal")}</p>
                      <p className="text-[11px] text-muted">{t("goalProgress")}</p>
                    </div>
                  </Card>

                  {/* Acara */}
                  <Card delay={0.2} className="flex flex-col">
                    <p className="text-[12px] font-medium text-muted">{t("upcoming")}</p>
                    <div className="mt-3 flex flex-col items-start gap-2">
                      <div className="grid w-12 shrink-0 overflow-hidden rounded-xl glass-card text-center">
                        <span className="bg-calendar py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                          {format.dateTime(new Date(2026, 9, 25), { month: "short" })}
                        </span>
                        <span className="py-1 text-[20px] font-semibold tracking-tight text-ink">25</span>
                      </div>
                      <div className="w-full min-w-0">
                        <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{t("event")}</p>
                        <p className="text-[11px] text-muted">{t("eventTime")}</p>
                      </div>
                    </div>
                    <p className="mt-auto flex items-center gap-1 pt-3 text-[11px] text-muted">
                      <MapPin className="size-3" /> Rooftop Kemang
                    </p>
                  </Card>

                  {/* Tugas */}
                  <Card delay={0.3} className="col-span-2 lg:col-span-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-medium text-muted">{t("today")}</p>
                      <p className="text-[12px] font-medium text-muted tabular-nums">1/3</p>
                    </div>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-3 sm:gap-3">
                      {tasks.map((task) => (
                        <li key={task.label} className="flex items-center gap-3 rounded-xl py-2 sm:bg-canvas sm:px-3">
                          <span
                            className={cn(
                              "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]",
                              task.done ? "border-transparent bg-tasks text-white" : "border-line-strong",
                            )}
                          >
                            {task.done && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span
                            className={cn(
                              "truncate text-[13px] font-medium",
                              task.done ? "text-muted line-through" : "text-ink",
                            )}
                          >
                            {task.label}
                          </span>
                          <span className="ml-auto size-1.5 shrink-0 rounded-full" style={{ background: task.color }} />
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
