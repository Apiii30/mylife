"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** Saklar iOS dengan label di kiri. */
export function Switch({
  checked,
  onChange,
  label,
  color = "var(--c-finance)",
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center justify-between gap-4 rounded-2xl bg-ink/4 px-4 py-3 text-left", className)}
    >
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <motion.span
        className="relative h-[26px] w-[44px] shrink-0 rounded-full p-0.5"
        animate={{ backgroundColor: checked ? color : "var(--line-strong)" }}
        transition={{ duration: 0.25 }}
      >
        <motion.span
          className="block size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25)]"
          animate={{ x: checked ? 18 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
        />
      </motion.span>
    </button>
  );
}
