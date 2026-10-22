"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const PARTICLES = 8;

type TaskCheckboxProps = {
  checked: boolean;
  color: string;
  onToggle: () => void;
  label: string;
  className?: string;
};

/** Lingkaran yang terisi warna kategori + centang tergambar + letupan partikel saat selesai. */
export function TaskCheckbox({ checked, color, onToggle, label, className }: TaskCheckboxProps) {
  const [burst, setBurst] = useState(0);

  function toggle() {
    if (!checked) setBurst((b) => b + 1);
    onToggle();
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={toggle}
      className={cn("relative grid size-6 shrink-0 place-items-center rounded-full", className)}
    >
      <motion.span
        className="absolute inset-0.5 rounded-full border-[1.75px]"
        initial={false}
        animate={{
          borderColor: checked ? color : "var(--line-strong)",
          backgroundColor: checked ? color : "rgba(0,0,0,0)",
          scale: checked ? [1, 1.2, 1] : 1,
        }}
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <svg viewBox="0 0 24 24" className="relative size-3.5 text-white" fill="none" aria-hidden>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: checked ? 0.08 : 0 }}
        />
      </svg>
      <AnimatePresence>
        {burst > 0 && checked && (
          <span key={burst} aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: PARTICLES }, (_, i) => {
              const angle = (i / PARTICLES) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full"
                  style={{ background: color }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x: Math.cos(angle) * 18, y: Math.sin(angle) * 18, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </button>
  );
}
