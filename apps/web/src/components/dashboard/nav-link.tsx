"use client";

import { motion, useTransform } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/components/ui/module-icon";
import type { ModuleDef } from "@/config/modules";
import { cn } from "@/lib/cn";
import { useSidebarReveal } from "./sidebar";

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function SidebarLink({ mod, label, collapsed }: { mod: ModuleDef; label: string; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, mod.href);
  const reveal = useSidebarReveal();
  const shift = useTransform(() => ((reveal?.get() ?? 1) - 1) * 8);

  return (
    <Link
      href={mod.href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 shrink-0 items-center gap-3 rounded-[14px] px-[12px] text-[14px] font-medium transition-colors",
        active ? "text-ink" : "text-ink-2 hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-[14px] bg-surface shadow-[0_1px_2px_rgb(40_50_140/0.08),0_6px_16px_-8px_rgb(40_50_140/0.25)] dark:bg-white/10"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span className="absolute inset-0 rounded-[14px] transition-colors group-hover:bg-ink/4" />
      <ModuleIcon
        icon={mod.icon}
        color={mod.color}
        size="sm"
        className="relative transition-transform duration-500 ease-spring group-hover:scale-110"
      />
      <motion.span style={reveal ? { opacity: reveal, x: shift } : undefined} className="relative truncate whitespace-nowrap">
        {label}
      </motion.span>
    </Link>
  );
}
