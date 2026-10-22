"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";

export type DonutSegment = { id: string; label: string; value: number; color: string };

type DonutChartProps = {
  segments: DonutSegment[];
  format: (n: number) => string;
  totalLabel: string;
  emptyText: string;
  size?: number;
  className?: string;
  /** Tata letak legenda: di samping (lebar) atau di bawah (sempit). */
  layout?: "side" | "stack";
};

const STROKE = 16;
const STROKE_ACTIVE = 24;
const GAP = 3; // celah antar potongan (px)
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Donut pengeluaran per kategori. Potongan "menyapu" masuk satu per satu,
 * potongan yang di-hover menebal dan angka di tengah berganti dengan halus.
 */
export function DonutChart({ segments, format, totalLabel, emptyText, size = 200, className, layout = "side" }: DonutChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = (size - STROKE_ACTIVE) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments.length > 1 ? GAP : 0;
  const current = segments.find((s) => s.id === active);
  const percent = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);

  const lengths = segments.map((segment) => (total ? (segment.value / total) * c : 0));
  const arcs = segments.map((segment, i) => ({
    ...segment,
    start: lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
    length: Math.max(0, lengths[i] - gap),
  }));

  return (
    <div
      className={cn(
        "flex items-center gap-4",
        layout === "side" ? "flex-col sm:flex-row" : "flex-col",
        className,
      )}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={totalLabel}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeOpacity={0.05} strokeWidth={STROKE} />
          <motion.g
            style={{ originX: "50%", originY: "50%" }}
            initial={{ rotate: -150, opacity: 0 }}
            animate={{ rotate: -90, opacity: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            {arcs.map((arc, i) => {
              const isActive = arc.id === active;
              const dim = active !== null && !isActive;
              return (
                <motion.circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={arc.color}
                  initial={{ strokeDasharray: `0 ${c}`, strokeDashoffset: -arc.start, strokeWidth: STROKE }}
                  animate={{
                    strokeDasharray: `${arc.length} ${c}`,
                    strokeDashoffset: -arc.start,
                    strokeWidth: isActive ? STROKE_ACTIVE : STROKE,
                    opacity: dim ? 0.3 : 1,
                  }}
                  transition={{
                    strokeDasharray: { duration: 1, ease: EASE, delay: 0.15 + i * 0.09 },
                    strokeDashoffset: { duration: 1, ease: EASE, delay: 0.15 + i * 0.09 },
                    strokeWidth: { type: "spring", stiffness: 400, damping: 26 },
                    opacity: { duration: 0.2 },
                  }}
                  className="cursor-pointer"
                  onPointerEnter={() => setActive(arc.id)}
                  onPointerLeave={() => setActive(null)}
                />
              );
            })}
          </motion.g>
        </svg>

        {/* Angka di tengah */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={current?.id ?? "total"}
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.3, ease: EASE }}
              className="px-2"
              style={{ maxWidth: size - STROKE_ACTIVE * 2 - 8 }}
            >
              <p className="truncate text-[12px] font-medium text-muted">{current ? current.label : totalLabel}</p>
              <p
                className="mt-0.5 leading-tight font-semibold tracking-[-0.03em] whitespace-nowrap text-ink"
                style={{ fontSize: Math.round(size * 0.088) }}
              >
                {total ? format(current ? current.value : total) : "—"}
              </p>
              {current && <p className="mt-0.5 text-[12px] font-medium text-ink-2 tabular-nums">{percent(current.value)}%</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {total === 0 ? (
        <p className="max-w-[16rem] text-center text-[14px] text-muted sm:text-left">{emptyText}</p>
      ) : (
        <ul className="w-full min-w-0 flex-1 space-y-1">
          {segments.map((segment, i) => {
            const isActive = segment.id === active;
            return (
              <motion.li
                key={segment.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: active && !isActive ? 0.45 : 1, x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: active ? 0 : 0.3 + i * 0.06 }}
                onPointerEnter={() => setActive(segment.id)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(segment.id)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1 outline-none transition-colors",
                  isActive && "bg-ink/4",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{segment.label}</span>
                <span className="text-[12px] text-muted tabular-nums">{percent(segment.value)}%</span>
                <span className="w-24 text-right text-[13px] font-semibold text-ink tabular-nums">{format(segment.value)}</span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
