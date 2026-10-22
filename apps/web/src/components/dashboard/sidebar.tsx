"use client";

import { LogOut } from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { createContext, useContext, ViewTransition } from "react";
import { LogoMark } from "@/components/ui/logo";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { MODULES, SETTINGS_MODULE } from "@/config/modules";
import { Avatar } from "./avatar";
import { SidebarLink } from "./nav-link";
import type { ShellUser } from "./shell";

export const SIDEBAR_WIDTH = { expanded: 264, collapsed: 80 };

/**
 * 0 → 1 mengikuti lebar sidebar. Label, nama, & tombol memudar sebanding lebarnya,
 * jadi tidak ada elemen yang "meloncat" saat sidebar dibuka/ditutup.
 */
const RevealContext = createContext<MotionValue<number> | null>(null);
export const useSidebarReveal = () => useContext(RevealContext);

type SidebarProps = { user: ShellUser; width: MotionValue<number>; collapsed: boolean };

export function Sidebar({ user, width, collapsed }: SidebarProps) {
  const t = useTranslations();
  const reveal = useTransform(width, [SIDEBAR_WIDTH.collapsed + 40, SIDEBAR_WIDTH.expanded], [0, 1], { clamp: true });
  const shift = useTransform(reveal, [0, 1], [-8, 0]);

  return (
    <RevealContext.Provider value={reveal}>
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        style={{ width }}
        className="glass glass-strong fixed top-3 bottom-3 left-3 z-40 hidden flex-col overflow-hidden rounded-[28px] px-3 pb-3 lg:flex"
      >
        {/* Baris logo setinggi top bar (h-14) agar keduanya sejajar */}
        <Link href="/dashboard" aria-label="MyLife" className="group/logo flex h-14 shrink-0 items-center gap-2 pl-[14px]">
          <ViewTransition name="brand-logo" share="morph" default="none">
            <LogoMark />
          </ViewTransition>
          <motion.span style={{ opacity: reveal, x: shift }} className="text-[17px] font-semibold tracking-[-0.03em] whitespace-nowrap text-ink">
            MyLife
          </motion.span>
        </Link>

        <nav className="mt-3 flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto">
          {MODULES.map((mod) => (
            <SidebarLink key={mod.key} mod={mod} label={t(`dashboard.nav.${mod.key}`)} collapsed={collapsed} />
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <SidebarLink mod={SETTINGS_MODULE} label={t("dashboard.nav.settings")} collapsed={collapsed} />
          <div className="mt-1 flex items-center gap-3 rounded-2xl bg-ink/4 p-1.5">
            <Avatar name={user.name} image={user.image} />
            <motion.div style={{ opacity: reveal, x: shift }} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ redirectTo: "/" })}
                aria-label={t("common.logout")}
                title={t("common.logout")}
                tabIndex={collapsed ? -1 : 0}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-calendar/10 hover:text-calendar"
              >
                <LogOut className="size-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </motion.aside>
    </RevealContext.Provider>
  );
}
