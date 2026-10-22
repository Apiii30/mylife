"use client";

import { Ellipsis, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { ModuleIcon } from "@/components/ui/module-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { moduleByKey, SETTINGS_MODULE, type ModuleKey } from "@/config/modules";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";
import { isActive } from "./nav-link";
import type { ShellUser } from "./shell";

const TAB_KEYS: ModuleKey[] = ["overview", "finance", "tasks", "calendar"];
const MORE_KEYS: ModuleKey[] = ["journal", "gallery", "goals", "grades", "settings"];

/** Tab bar kaca di bawah layar (ponsel) + sheet "Lainnya". */
export function MobileNav({ user }: { user: ShellUser }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = MORE_KEYS.some((key) => isActive(pathname, moduleByKey(key).href));

  const tabClass = "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium";

  return (
    <>
      <nav className="glass glass-strong glass-refract fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch rounded-[24px] px-1.5 lg:hidden">
        {TAB_KEYS.map((key) => {
          const mod = moduleByKey(key);
          const active = isActive(pathname, mod.href);
          const Icon = mod.icon;
          return (
            <Link key={key} href={mod.href} className={cn(tabClass, active ? "text-ink" : "text-muted")}>
              {active && (
                <motion.span
                  layoutId="mobile-tab"
                  className="absolute inset-x-0.5 inset-y-1.5 rounded-[18px] bg-ink/7"
                  transition={{ type: "spring", stiffness: 450, damping: 36 }}
                />
              )}
              <Icon className="relative size-[22px]" style={active ? { color: mod.color } : undefined} strokeWidth={2} />
              <span className="relative">{t(`dashboard.nav.${key}`)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(tabClass, moreActive ? "text-ink" : "text-muted")}
        >
          {moreActive && (
            <motion.span
              layoutId="mobile-tab"
              className="absolute inset-x-0.5 inset-y-1.5 rounded-[18px] bg-ink/7"
              transition={{ type: "spring", stiffness: 450, damping: 36 }}
            />
          )}
          <Ellipsis className="relative size-[22px]" />
          <span className="relative">{t("dashboard.nav.more")}</span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setOpen(false)}
              className="glass glass-strong fixed inset-x-3 bottom-3 z-50 rounded-[32px] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15" />
              <div className="grid grid-cols-4 gap-2">
                {MORE_KEYS.map((key) => {
                  const mod = key === "settings" ? SETTINGS_MODULE : moduleByKey(key);
                  return (
                    <Link
                      key={key}
                      href={mod.href}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-2 rounded-2xl py-3 text-[12px] font-medium text-ink-2 active:scale-95"
                    >
                      <ModuleIcon icon={mod.icon} color={mod.color} size="lg" />
                      {t(`dashboard.nav.${key}`)}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-ink/4 p-2">
                <Avatar name={user.name} image={user.image} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-[12px] text-muted">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ redirectTo: "/" })}
                  className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-calendar hover:bg-calendar/10"
                >
                  <LogOut className="size-4" />
                  {t("common.logout")}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-2">
                <LocaleToggle />
                <ThemeToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
