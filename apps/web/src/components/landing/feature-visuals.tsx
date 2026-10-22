"use client";

import { Angry, Frown, Laugh, Meh, Smile } from "lucide-react";
import { motion, useInView, type Variants } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/ui/count-up";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import { demoMoney } from "@/lib/format";

function useOnceInView<T extends Element>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  return [ref, inView] as const;
}

// ─── Keuangan ──────────────────────────────────────────────

const BARS = [46, 60, 52, 71, 63, 88];

export function FinanceVisual() {
  const t = useTranslations("landing.features.finance");
  const money = demoMoney(useLocale());
  const [ref, inView] = useOnceInView<HTMLDivElement>();
  const months = t("months").split(",");

  return (
    <div ref={ref} className="flex h-full flex-col justify-end gap-5">
      <div>
        <p className="text-[13px] font-medium text-muted">{t("balance")}</p>
        <CountUp
          value={4_250_000}
          format={money}
          className="block text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.045em] text-ink tabular-nums"
        />
      </div>
      <div className="flex h-36 items-end gap-2 sm:gap-3">
        {BARS.map((height, i) => {
          const last = i === BARS.length - 1;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <motion.div
                className={cn("w-full rounded-t-[10px] rounded-b-[4px]", !last && "bg-ink/7")}
                style={{
                  height: `${height}%`,
                  originY: 1,
                  ...(last && {
                    background: "linear-gradient(180deg, color-mix(in srgb, var(--c-finance) 70%, white), var(--c-finance))",
                    boxShadow: "0 10px 30px -10px var(--c-finance)",
                  }),
                }}
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : undefined}
                transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.07 }}
              />
              <span className={cn("text-[11px] font-medium", last ? "text-ink" : "text-muted")}>{months[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── To-Do ─────────────────────────────────────────────────

export function TasksVisual() {
  const t = useTranslations("landing.features.tasks");
  const [ref, inView] = useOnceInView<HTMLUListElement>();
  const [done, setDone] = useState(0);
  const items = t("items").split(",");
  const colors = ["var(--c-goals)", "var(--c-journal)", "var(--c-gallery)"];

  useEffect(() => {
    if (!inView) return;
    const timers = items.map((_, i) => setTimeout(() => setDone(i + 1), 700 + i * 850));
    return () => timers.forEach(clearTimeout);
  }, [inView, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ul ref={ref} className="flex flex-col gap-2">
      {items.map((item, i) => {
        const checked = i < done;
        return (
          <li key={item} className="flex items-center gap-3 rounded-2xl bg-canvas px-3.5 py-3">
            <span className="relative grid size-[22px] shrink-0 place-items-center">
              <motion.span
                className="absolute inset-0 rounded-full border-[1.5px]"
                animate={{
                  borderColor: checked ? "rgba(0,0,0,0)" : "var(--line-strong)",
                  backgroundColor: checked ? "var(--c-tasks)" : "rgba(0,0,0,0)",
                  scale: checked ? [1, 1.25, 1] : 1,
                }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
              />
              <svg viewBox="0 0 24 24" className="relative size-3.5 text-white" fill="none">
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: checked ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: "easeOut", delay: checked ? 0.1 : 0 }}
                />
              </svg>
            </span>
            <span className="relative min-w-0 truncate text-[14px] font-medium">
              <motion.span animate={{ color: checked ? "var(--muted)" : "var(--ink)" }}>{item}</motion.span>
              <motion.span
                aria-hidden
                className="absolute top-1/2 left-0 h-[1.5px] w-full origin-left bg-muted"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: checked ? 1 : 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.15 }}
              />
            </span>
            <span className="ml-auto size-2 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
          </li>
        );
      })}
    </ul>
  );
}

// ─── Kalender ──────────────────────────────────────────────

// Oktober 2026 dimulai hari Kamis → 3 sel kosong (Sen, Sel, Rab)
const LEADING = 3;
const DAYS = 31;
const TODAY = 21;
const DOTS: Record<number, string> = {
  3: "var(--c-tasks)",
  9: "var(--c-finance)",
  14: "var(--c-journal)",
  17: "var(--c-goals)",
  25: "var(--c-gallery)",
  28: "var(--c-tasks)",
};

export function CalendarVisual() {
  const t = useTranslations("landing.features.calendar");
  const [ref, inView] = useOnceInView<HTMLDivElement>();
  const weekdays = t("weekdays").split(",");

  return (
    <div ref={ref} className="grid grid-cols-7 gap-y-1 text-center">
      {weekdays.map((d, i) => (
        <span key={i} className="pb-1 text-[10px] font-semibold text-muted">
          {d}
        </span>
      ))}
      {Array.from({ length: LEADING }, (_, i) => (
        <span key={`e${i}`} />
      ))}
      {Array.from({ length: DAYS }, (_, i) => {
        const day = i + 1;
        const isToday = day === TODAY;
        return (
          <motion.span
            key={day}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : undefined}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.1 + i * 0.012 }}
            className="relative mx-auto grid size-7 place-items-center"
          >
            {isToday && (
              <>
                <motion.span
                  className="absolute inset-0 rounded-full bg-calendar"
                  animate={inView ? { scale: [1, 1.7], opacity: [0.35, 0] } : undefined}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 1 }}
                />
                <span className="absolute inset-0 rounded-full bg-calendar" />
              </>
            )}
            <span
              className={cn(
                "relative text-[12px] font-medium tabular-nums",
                isToday ? "font-semibold text-white" : "text-ink-2",
              )}
            >
              {day}
            </span>
            {DOTS[day] && (
              <span className="absolute -bottom-0.5 size-1 rounded-full" style={{ background: DOTS[day] }} />
            )}
          </motion.span>
        );
      })}
    </div>
  );
}

// ─── Jurnal ────────────────────────────────────────────────

const MOODS = [Laugh, Smile, Meh, Frown, Angry];

export function JournalVisual() {
  const t = useTranslations("landing.features.journal");
  const [ref, inView] = useOnceInView<HTMLDivElement>();
  const text = t("entry");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [inView, text]);

  return (
    <div ref={ref} className="flex h-full flex-col gap-4">
      <div className="flex gap-1.5">
        {MOODS.map((Icon, i) => (
          <span
            key={i}
            className={cn(
              "grid size-9 place-items-center rounded-full transition-colors",
              i === 0 ? "bg-journal text-white shadow-[0_6px_16px_-6px_var(--c-journal)]" : "bg-canvas text-muted",
            )}
          >
            <Icon className="size-[18px]" />
          </span>
        ))}
      </div>
      <p className="min-h-[4.5rem] font-serif text-[16px] leading-relaxed text-ink-2 italic">
        {text.slice(0, count)}
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-journal"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        />
      </p>
    </div>
  );
}

// ─── Goals (kartu kecil) ───────────────────────────────────

const GOAL_BARS = [
  { value: 68, color: "var(--c-goals)" },
  { value: 42, color: "var(--c-finance)" },
  { value: 85, color: "var(--c-tasks)" },
];

export function GoalsVisual() {
  const t = useTranslations("landing.features.goals");
  const [ref, inView] = useOnceInView<HTMLDivElement>();
  const goals = t("items")
    .split(",")
    .map((label, i) => ({ label, ...GOAL_BARS[i] }));

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {goals.map((goal, i) => (
        <div key={goal.label}>
          <div className="mb-1.5 flex justify-between text-[13px] font-medium">
            <span className="text-ink">{goal.label}</span>
            <span className="text-muted tabular-nums">{goal.value}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/6">
            <motion.div
              className="relative h-full overflow-hidden rounded-full"
              style={{ background: goal.color }}
              initial={{ width: 0 }}
              animate={inView ? { width: `${goal.value}%` } : undefined}
              transition={{ duration: 1.6, ease: EASE_OUT_EXPO, delay: 0.2 + i * 0.12 }}
            >
              {/* Kilau cair yang mengalir */}
              <span className="animate-shimmer absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgb(255_255_255/0.45)_50%,transparent_75%)] bg-[length:200%_100%]" />
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Memories ──────────────────────────────────────────────

function Scene({ kind }: { kind: number }) {
  switch (kind) {
    case 0: // senja di pegunungan
      return (
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="s0" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff7eb3" />
              <stop offset="0.55" stopColor="#ff9a6b" />
              <stop offset="1" stopColor="#ffd27a" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#s0)" />
          <circle cx="62" cy="46" r="13" fill="#fff4d6" opacity="0.95" />
          <path d="M0 58 L22 36 L38 52 L56 30 L78 54 L100 40 V80 H0Z" fill="#7a3d6b" opacity="0.85" />
          <path d="M0 66 L28 50 L52 64 L74 48 L100 62 V80 H0Z" fill="#4a2350" />
        </svg>
      );
    case 1: // pantai
      return (
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6ec6ff" />
              <stop offset="1" stopColor="#c8ecff" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#s1)" />
          <circle cx="78" cy="18" r="8" fill="#fff6c9" />
          <rect y="44" width="100" height="16" fill="#1e88c8" />
          <path d="M0 50 Q12 47 25 50 T50 50 T75 50 T100 50 V60 H0Z" fill="#46a9e3" />
          <path d="M0 62 Q30 54 100 60 V80 H0Z" fill="#f4dcae" />
        </svg>
      );
    case 2: // malam berbintang
      return (
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="s2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1437" />
              <stop offset="1" stopColor="#36487f" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#s2)" />
          {[
            [12, 12],
            [30, 22],
            [48, 8],
            [70, 26],
            [86, 12],
            [20, 36],
            [58, 34],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" fill="#fff" />
          ))}
          <circle cx="74" cy="20" r="9" fill="#f5f0da" />
          <circle cx="78" cy="17" r="8" fill="#0f1a45" />
          <path d="M0 64 L18 52 L30 60 L48 46 L64 58 L80 50 L100 60 V80 H0Z" fill="#141c3d" />
        </svg>
      );
    case 3: // bukit hijau
      return (
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="s3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9f2c7" />
              <stop offset="1" stopColor="#f3fbe0" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#s3)" />
          <path d="M0 52 Q30 34 60 50 T100 46 V80 H0Z" fill="#7fcf86" />
          <path d="M0 64 Q40 48 100 62 V80 H0Z" fill="#3f9f58" />
          {[18, 26, 72, 80].map((x, i) => (
            <path key={x} d={`M${x} ${58 - (i % 2) * 4} l5 12 h-10z`} fill="#2b6f3d" />
          ))}
        </svg>
      );
    default: // kota senja
      return (
        <svg viewBox="0 0 100 80" className="size-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="s4" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b3cc4" />
              <stop offset="1" stopColor="#f08bb8" />
            </linearGradient>
          </defs>
          <rect width="100" height="80" fill="url(#s4)" />
          {[
            [4, 40, 14],
            [20, 28, 12],
            [34, 46, 10],
            [46, 22, 14],
            [62, 36, 12],
            [76, 30, 10],
            [88, 44, 12],
          ].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={80 - y} fill="#22164f" />
              {Array.from({ length: Math.floor((80 - y) / 8) }, (_, r) => (
                <rect key={r} x={x + 3} y={y + 4 + r * 8} width="2" height="2" fill="#ffd77a" opacity={(x + r) % 3 ? 0.9 : 0.25} />
              ))}
            </g>
          ))}
        </svg>
      );
  }
}

const PHOTOS = [
  { caption: "Bromo · 03.25", fan: { x: -230, rotate: -11, y: 14 }, spread: { x: -300, rotate: -14, y: 6 } },
  { caption: "Bali · 06.25", fan: { x: -115, rotate: -5, y: 2 }, spread: { x: -150, rotate: -6, y: -8 } },
  { caption: "Malam · 08.25", fan: { x: 0, rotate: 1, y: -6 }, spread: { x: 0, rotate: 0, y: -16 } },
  { caption: "Dieng · 11.25", fan: { x: 115, rotate: 6, y: 2 }, spread: { x: 150, rotate: 7, y: -8 } },
  { caption: "Jakarta · 01.26", fan: { x: 230, rotate: 12, y: 14 }, spread: { x: 300, rotate: 14, y: 6 } },
];

const photoVariants: Variants = {
  stack: (i: number) => ({ x: 0, y: 30, rotate: (i - 2) * 3, opacity: 0, scale: 0.9 }),
  fan: (i: number) => ({ ...PHOTOS[i].fan, opacity: 1, scale: 1 }),
  spread: (i: number) => ({ ...PHOTOS[i].spread, opacity: 1, scale: 1.04 }),
};

export function GalleryVisual() {
  return (
    <motion.div
      className="relative mx-auto flex h-64 w-full max-w-[720px] items-center justify-center max-sm:scale-[0.62] sm:h-72"
      initial="stack"
      whileInView="fan"
      whileHover="spread"
      viewport={{ once: true, margin: "-15% 0px" }}
    >
      {PHOTOS.map((photo, i) => (
        <motion.figure
          key={photo.caption}
          custom={i}
          variants={photoVariants}
          transition={{ type: "spring", stiffness: 140, damping: 18, delay: i * 0.04 }}
          className="absolute w-40 rounded-[14px] bg-white p-2 pb-0 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_20px_40px_-16px_rgb(0_0_0/0.35)] sm:w-44"
          style={{ zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
        >
          <div className="aspect-[5/4] overflow-hidden rounded-[8px]">
            <Scene kind={i} />
          </div>
          <figcaption className="py-2 text-center font-mono text-[10px] tracking-wide text-neutral-500">
            {photo.caption}
          </figcaption>
        </motion.figure>
      ))}
    </motion.div>
  );
}

// ─── Nilai kuliah ──────────────────────────────────────────

const SEMESTER_IP = [3.42, 3.6, 3.55, 3.81, 3.74, 3.9];

export function GradesVisual() {
  const t = useTranslations("landing.features.grades");
  const [ref, inView] = useOnceInView<HTMLDivElement>();

  return (
    <div ref={ref} className="flex h-full flex-col justify-end gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">{t("gpa")}</p>
          <CountUp
            value={3.67}
            format={(n) => n.toFixed(2)}
            className="block text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-[-0.045em] text-ink tabular-nums"
          />
        </div>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 20 }}
          className="mb-2 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{ color: "var(--c-grades)", background: "color-mix(in srgb, var(--c-grades) 14%, transparent)" }}
        >
          {t("predicate")}
        </motion.span>
      </div>
      <div className="flex h-28 items-end gap-2">
        {SEMESTER_IP.map((ip, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <motion.div
              className="w-full rounded-t-[8px] rounded-b-[3px]"
              style={{
                height: `${((ip - 2.5) / 1.5) * 100}%`,
                originY: 1,
                background: `color-mix(in srgb, var(--c-grades) ${40 + i * 12}%, transparent)`,
              }}
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : undefined}
              transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.15 + i * 0.07 }}
            />
            <span className="text-[11px] font-medium text-muted">S{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
