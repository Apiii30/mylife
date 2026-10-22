"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** Kontrol tersegmentasi ala iOS dengan "pil" yang meluncur ke opsi aktif. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  layoutId,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; tint?: string }[];
  onChange: (v: T) => void;
  layoutId: string;
}) {
  return (
    <div className="grid rounded-full bg-ink/5 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn("relative h-8 rounded-full text-[13px] font-medium transition-colors", active ? "text-ink" : "text-muted hover:text-ink")}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                style={o.tint ? { background: `color-mix(in srgb, ${o.tint} 16%, var(--surface))` } : undefined}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1" style={active && o.tint ? { color: o.tint } : undefined}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
