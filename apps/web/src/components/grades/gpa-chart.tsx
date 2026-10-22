"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { smoothPath, SPRING } from "@/components/charts/scale";
import { useMeasuredSize } from "@/hooks/use-measure";

export type GpaDatum = { key: string; label: string; fullLabel: string; ip: number | null; cumulative: number | null; credits: number };

type GpaChartProps = {
  data: GpaDatum[];
  format: (n: number | null) => string;
  labels: { ip: string; ipk: string; credits: (n: number) => string };
  selected?: string;
  onSelect?: (key: string) => void;
};

const PAD = { top: 18, right: 8, bottom: 30, left: 34 };
const HEIGHT = 200;
const TICKS = [0, 1, 2, 3, 4];
const TOOLTIP_W = 168;

/**
 * IP per semester (batang) + IPK kumulatif (garis). Keduanya skala 0–4 yang sama, jadi satu sumbu.
 * Batang dimulai dari nol; tooltip kaca mengikuti kolom yang di-hover.
 */
export function GpaChart({ data, format, labels, selected, onSelect }: GpaChartProps) {
  const [ref, size] = useMeasuredSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const width = size.width;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(8, Math.min(22, band * 0.42));
  const y = (v: number) => baseline - (v / 4) * plotH;
  const cx = (i: number) => PAD.left + i * band + band / 2;

  const linePoints = data.flatMap((d, i) => (d.cumulative === null ? [] : [[cx(i), y(d.cumulative)] as const]));
  const hovered = hover !== null ? data[hover] : null;
  const tooltipX = hover !== null ? Math.min(Math.max(cx(hover) - TOOLTIP_W / 2, 0), Math.max(0, width - TOOLTIP_W)) : 0;

  return (
    <div ref={ref} className="relative" style={{ height: HEIGHT }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={`${labels.ip} / ${labels.ipk}`}>
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={width} height={baseline} />
            </clipPath>
          </defs>

          {TICKS.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeDasharray={tick === 0 ? undefined : "2 4"} />
              <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                {tick}
              </text>
            </g>
          ))}

          {/* Batang IP — ujung atas membulat, bawah rata (dipotong di baseline) */}
          <g clipPath={`url(#${clipId})`}>
            {data.map((d, i) => {
              const h = d.ip === null ? 0 : baseline - y(d.ip);
              const active = selected === d.key;
              const dim = hover !== null && hover !== i;
              return (
                <motion.rect
                  key={d.key}
                  x={cx(i) - barW / 2}
                  width={barW}
                  rx={4}
                  fill="var(--viz-1)"
                  initial={{ y: baseline, height: 0 }}
                  animate={{ y: baseline - h, height: h ? h + 4 : 0, opacity: dim ? 0.35 : active || selected === undefined ? 1 : 0.6 }}
                  transition={{ ...SPRING, delay: i * 0.06, opacity: { duration: 0.2 } }}
                />
              );
            })}
          </g>

          {/* Garis IPK kumulatif */}
          {linePoints.length > 1 && (
            <motion.path
              d={smoothPath(linePoints)}
              fill="none"
              stroke="var(--ink-2)"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          )}
          {data.map((d, i) =>
            d.cumulative === null ? null : (
              <motion.circle
                key={d.key}
                cx={cx(i)}
                cy={y(d.cumulative)}
                r={hover === i ? 6 : 4}
                fill="var(--surface)"
                stroke="var(--ink-2)"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.06 }}
              />
            ),
          )}

          {data.map((d, i) => (
            <g key={d.key}>
              <text x={cx(i)} y={HEIGHT - 8} textAnchor="middle" className={selected === d.key ? "fill-ink text-[11px] font-semibold" : "fill-muted text-[11px]"}>
                {d.label}
              </text>
              {/* Area hover lebih besar dari batangnya */}
              <rect
                x={PAD.left + i * band}
                y={PAD.top}
                width={band}
                height={plotH + PAD.bottom}
                fill="transparent"
                className={onSelect ? "cursor-pointer" : undefined}
                onMouseEnter={() => setHover(i)}
                onClick={() => onSelect?.(d.key)}
              />
            </g>
          ))}
        </svg>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, x: tooltipX }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className="glass glass-strong pointer-events-none absolute top-0 left-0 rounded-2xl px-3.5 py-2.5"
            style={{ width: TOOLTIP_W }}
          >
            <p className="text-[12px] font-semibold text-ink">{hovered.fullLabel}</p>
            <p className="mt-1 flex items-center justify-between text-[12px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[var(--viz-1)]" />
                {labels.ip}
              </span>
              <span className="font-semibold tabular-nums">{format(hovered.ip)}</span>
            </p>
            <p className="flex items-center justify-between text-[12px] text-ink-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full border-2 border-ink-2" />
                {labels.ipk}
              </span>
              <span className="font-semibold tabular-nums">{format(hovered.cumulative)}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{labels.credits(hovered.credits)}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <table className="sr-only">
        <thead>
          <tr>
            <th>Semester</th>
            <th>{labels.ip}</th>
            <th>{labels.ipk}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.fullLabel}</td>
              <td>{format(d.ip)}</td>
              <td>{format(d.cumulative)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
