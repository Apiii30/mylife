"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** Kartu permukaan standar dashboard dengan animasi masuk. */
export function Card({
  title,
  subtitle,
  action,
  index = 0,
  className,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + index * 0.06 }}
      className={cn("relative flex flex-col rounded-[24px] glass-card p-4 sm:p-5", className)}
    >
      {(title || action) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}
