"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { moduleByKey, type ModuleKey } from "@/config/modules";
import { cn } from "@/lib/cn";

type WidgetProps = {
  module: ModuleKey;
  title: string;
  index?: number;
  className?: string;
  children: React.ReactNode;
};

export function Widget({ module, title, index = 0, className, children }: WidgetProps) {
  const mod = moduleByKey(module);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay: 0.1 + index * 0.06 }}
      className={cn(
        "group relative flex flex-col rounded-[24px] glass-card p-4 sm:p-5",
        "transition-shadow duration-500 hover:shadow-[0_20px_50px_-24px_rgb(0_0_0/0.2)]",
        className,
      )}
    >
      <header className="flex items-center gap-2.5">
        <ModuleIcon icon={mod.icon} color={mod.color} size="sm" />
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        <Link
          href={mod.href}
          aria-label={title}
          className="ml-auto grid size-7 place-items-center rounded-full text-muted opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-ink/5 hover:text-ink focus-visible:opacity-100"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </header>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </motion.section>
  );
}

export function EmptyState({ module, text, cta }: { module: ModuleKey; text: string; cta: string }) {
  const mod = moduleByKey(module);
  return (
    <div className="flex flex-1 flex-col items-start justify-end gap-3">
      <p className="text-[14px] leading-snug text-muted">{text}</p>
      <Link
        href={mod.href}
        className="inline-flex h-9 items-center gap-1.5 rounded-full pr-4 pl-3 text-[13px] font-semibold transition-[filter,transform] duration-300 hover:brightness-110 active:scale-95"
        style={{ background: `color-mix(in srgb, ${mod.color} 14%, transparent)`, color: mod.color }}
      >
        <Plus className="size-4" strokeWidth={2.5} />
        {cta}
      </Link>
    </div>
  );
}
