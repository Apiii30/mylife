"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { animate, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Angka yang beranimasi dari nilai lama ke nilai baru (saat ganti bulan / data berubah). */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);

  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        from.current = n;
        if (ref.current) ref.current.textContent = format(n);
      },
    });
    return () => controls.stop();
  }, [value, format]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}

type DeltaProps = { change: number | null; goodWhenUp: boolean };

/** Perubahan vs bulan lalu. Warna = arah × apakah naik itu baik. */
export function Delta({ change, goodWhenUp }: DeltaProps) {
  const t = useTranslations("finance");
  if (change === null || !Number.isFinite(change)) return <span className="text-[12px] text-subtle">—</span>;
  const up = change >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
          good ? "bg-income/12 text-income" : "bg-expense/12 text-expense",
        )}
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
        {Math.abs(change).toFixed(change !== 0 && Math.abs(change) < 10 ? 1 : 0)}%
      </span>
      <span className="text-muted">{t("vsLastMonth")}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  format,
  delta,
  color,
  index = 0,
  dimmed,
  children,
  className,
  valueClassName = "text-[clamp(1.05rem,4.6vw,1.65rem)] sm:text-[clamp(1.25rem,2.2vw,1.65rem)]",
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  delta?: React.ReactNode;
  color?: string;
  index?: number;
  dimmed?: boolean;
  children?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: dimmed ? 0.6 : 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.06 }}
      className={cn("rounded-[20px] glass-card p-4", className)}
    >
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
        {color && <span className="size-2.5 rounded-[3px]" style={{ background: color }} />}
        {label}
      </p>
      <AnimatedNumber
        value={value}
        format={format}
        className={cn("mt-1 block truncate font-semibold tracking-[-0.04em] text-ink", valueClassName)}
      />
      {delta && <div className="mt-1.5">{delta}</div>}
      {children}
    </motion.div>
  );
}
