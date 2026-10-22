"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { useMeasuredSize } from "@/hooks/use-measure";
import { cn } from "@/lib/cn";
import { niceTicks, SPRING } from "./scale";

export type CashflowDatum = { key: string; label: string; fullLabel: string; income: number; expense: number };

type CashflowChartProps = {
  data: CashflowDatum[];
  format: (n: number) => string;
  compact: (n: number) => string;
  labels: { income: string; expense: string; net: string; empty: string };
  selected?: string;
  onSelect?: (key: string) => void;
  /** Tinggi tetap. Jika kosong, grafik mengisi tinggi kontainernya (min. 240px). */
  height?: number;
  className?: string;
};

const PAD = { top: 16, right: 4, bottom: 30, left: 56 };
const GHOST = [0.35, 0.55, 0.45, 0.7, 0.5, 0.8];
const TOOLTIP_W = 196;

/**
 * Bar chart pemasukan vs pengeluaran per bulan.
 * Batang tumbuh dari baseline dengan pegas, berubah halus saat data berganti,
 * dan tooltip kaca "meluncur" mengikuti kolom yang di-hover.
 */
export function CashflowChart({
  data,
  format,
  compact,
  labels,
  selected,
  onSelect,
  height: fixedHeight,
  className,
}: CashflowChartProps) {
  const [ref, size] = useMeasuredSize<HTMLDivElement>();
  const width = size.width;
  const height = fixedHeight ?? Math.max(200, size.height);
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const max = Math.max(0, ...data.flatMap((d) => [d.income, d.expense]));
  const empty = max === 0;
  const ticks = niceTicks(empty ? 1 : max);
  const top = ticks.at(-1) ?? 1;

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(6, Math.min(22, (band * 0.62 - 2) / 2));
  const y = (v: number) => baseline - (v / top) * plotH;
  const colX = (i: number) => PAD.left + i * band;

  const hovered = hover !== null ? data[hover] : null;
  const tooltipX =
    hover !== null ? Math.min(Math.max(colX(hover) + band / 2 - TOOLTIP_W / 2, 0), Math.max(0, width - TOOLTIP_W)) : 0;

  function bar(i: number, value: number, side: 0 | 1, color: string) {
    const x = colX(i) + band / 2 + (side === 0 ? -barW - 1 : 1);
    const h = baseline - y(value);
    const dim = hover !== null && hover !== i;
    return (
      <motion.rect
        x={x}
        width={barW}
        rx={4}
        fill={color}
        initial={{ y: baseline, height: 0 }}
        animate={{ y: y(value), height: h > 0 ? h + 4 : 0, opacity: dim ? 0.3 : 1 }}
        transition={{ ...SPRING, delay: i * 0.05 + side * 0.03, opacity: { duration: 0.2 } }}
      />
    );
  }

  return (
    <div
      ref={ref}
      className={cn("relative w-full select-none", !fixedHeight && "min-h-[200px] flex-1", className)}
      style={fixedHeight ? { height: fixedHeight } : undefined}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="absolute inset-0"
          role="img"
          aria-label={`${labels.income} / ${labels.expense}`}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={width} height={baseline} />
            </clipPath>
          </defs>

          {/* Grid & sumbu Y — hairline, recessive */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth={1} />
              {!empty && (
                <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-subtle text-[11px] tabular-nums">
                  {compact(tick)}
                </text>
              )}
            </g>
          ))}

          {/* Sorotan kolom yang meluncur */}
          <motion.rect
            y={PAD.top - 6}
            height={plotH + 6}
            width={Math.max(0, band - 6)}
            rx={12}
            fill="var(--ink)"
            initial={false}
            animate={{ x: colX(hover ?? 0) + 3, opacity: hover !== null ? 0.045 : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          />

          <g clipPath={`url(#${clipId})`}>
            {empty
              ? data.map((d, i) => (
                  <motion.rect
                    key={d.key}
                    x={colX(i) + band / 2 - barW}
                    width={barW * 2 + 2}
                    rx={4}
                    fill="var(--ink)"
                    fillOpacity={0.05}
                    initial={{ y: baseline, height: 0 }}
                    animate={{ y: baseline - GHOST[i % GHOST.length] * plotH, height: GHOST[i % GHOST.length] * plotH + 4 }}
                    transition={{ ...SPRING, delay: i * 0.05 }}
                  />
                ))
              : data.map((d, i) => (
                  <g key={d.key}>
                    {bar(i, d.income, 0, "var(--viz-income)")}
                    {bar(i, d.expense, 1, "var(--viz-expense)")}
                  </g>
                ))}
          </g>

          {/* Label bulan */}
          {data.map((d, i) => {
            const active = d.key === selected;
            return (
              <g key={d.key}>
                <text
                  x={colX(i) + band / 2}
                  y={baseline + 18}
                  textAnchor="middle"
                  className={cn("text-[11px]", active ? "fill-ink font-semibold" : "fill-muted")}
                >
                  {d.label}
                </text>
                {active && <circle cx={colX(i) + band / 2} cy={baseline + 26} r={2} className="fill-ink" />}
              </g>
            );
          })}

          {/* Area hit per kolom (lebih besar dari batangnya) + keyboard */}
          {!empty &&
            data.map((d, i) => (
              <rect
                key={d.key}
                x={colX(i)}
                y={0}
                width={band}
                height={height}
                fill="transparent"
                tabIndex={0}
                role={onSelect ? "button" : undefined}
                aria-label={`${d.fullLabel}: ${labels.income} ${format(d.income)}, ${labels.expense} ${format(d.expense)}`}
                className={cn("outline-none", onSelect && "cursor-pointer")}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect?.(d.key)}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(d.key);
                  }
                }}
              />
            ))}
        </svg>
      )}

      {empty && width > 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center pb-6">
          <p className="rounded-full bg-surface/80 px-4 py-2 text-[13px] text-muted backdrop-blur">{labels.empty}</p>
        </div>
      )}

      {/* Tooltip kaca */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.96, x: tooltipX }}
            animate={{ opacity: 1, y: 0, scale: 1, x: tooltipX }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="glass glass-strong pointer-events-none absolute -top-2 left-0 z-10 rounded-2xl p-3"
            style={{ width: TOOLTIP_W }}
          >
            <p className="text-[12px] font-semibold text-ink">{hovered.fullLabel}</p>
            <div className="mt-2 space-y-1.5 text-[12px]">
              {[
                { label: labels.income, value: hovered.income, color: "var(--viz-income)" },
                { label: labels.expense, value: hovered.expense, color: "var(--viz-expense)" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: row.color }} />
                  <span className="text-muted">{row.label}</span>
                  <span className="ml-auto font-semibold text-ink tabular-nums">{format(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-line pt-1.5">
                <span className="w-3" />
                <span className="text-muted">{labels.net}</span>
                <span className="ml-auto font-semibold text-ink tabular-nums">
                  {hovered.income - hovered.expense > 0 ? "+" : ""}
                  {format(hovered.income - hovered.expense)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tampilan tabel untuk pembaca layar */}
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">—</th>
            <th scope="col">{labels.income}</th>
            <th scope="col">{labels.expense}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.fullLabel}</th>
              <td>{format(d.income)}</td>
              <td>{format(d.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
