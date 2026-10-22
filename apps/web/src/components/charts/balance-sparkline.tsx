"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { useMeasuredWidth } from "@/hooks/use-measure";
import { smoothPath } from "./scale";

type Point = { label: string; value: number };

type SparklineProps = {
  points: Point[];
  format: (n: number) => string;
  color?: string;
  height?: number;
};

/** Tren saldo dalam satu bulan: area tipis + garis 2px + crosshair saat di-hover. */
export function BalanceSparkline({ points, format, color = "var(--viz-income)", height = 88 }: SparklineProps) {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const data = points.length === 1 ? [{ ...points[0] }, points[0]] : points;
  const values = data.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const pad = 6;
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * (width - pad * 2) + pad : width / 2);
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((p, i) => [x(i), y(p.value)] as const);
  const line = smoothPath(pts);
  const last = pts.at(-1);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (data.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - pad) / (width - pad * 2);
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1)))));
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} className="overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {min < 0 && <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeWidth={1} />}
          <motion.path
            d={`${line} L ${last?.[0]} ${height} L ${pts[0][0]} ${height} Z`}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, d: `${line} L ${last?.[0]} ${height} L ${pts[0][0]} ${height} Z` }}
            transition={{ duration: 0.8, delay: 0.4 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, d: line }}
            transition={{ pathLength: { duration: 1.4, ease: [0.16, 1, 0.3, 1] }, d: { duration: 0.6 } }}
          />
          {last && hover === null && (
            <motion.circle
              cx={last[0]}
              cy={last[1]}
              r={4}
              fill={color}
              stroke="var(--surface)"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 400, damping: 18 }}
            />
          )}
          {hover !== null && (
            <g>
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={height} stroke="var(--line-strong)" strokeWidth={1} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {hover !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, x: Math.min(Math.max(pts[hover][0] - 70, 0), Math.max(0, width - 140)) }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="glass glass-strong pointer-events-none absolute -top-12 left-0 w-[140px] rounded-xl px-3 py-2"
          >
            <p className="text-[11px] text-muted">{data[hover].label}</p>
            <p className="text-[13px] font-semibold text-ink tabular-nums">{format(data[hover].value)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
