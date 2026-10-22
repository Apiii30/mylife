"use client";

import { Bell, BellOff, ChevronRight, LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { Popover } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";
import type { ShellUser } from "./shell";

const iconButton = "relative grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink";

/** Lonceng dengan lencana jumlah notifikasi belum dibaca + panel daftar. */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const { items, unread, isUnread, markSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  // Penanda "baru" tetap terlihat selama panel terbuka walau sudah ditandai dibaca
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    if (!open) {
      setHighlight(new Set(items.filter(isUnread).map((n) => n.key)));
      if (unread) markSeen();
    }
    setOpen(!open);
  }

  return (
    <Popover
      open={open}
      onClose={close}
      className="w-[380px] max-sm:left-3 max-sm:right-3! max-sm:w-auto"
      trigger={
        <button type="button" onClick={toggle} aria-label={t("title")} aria-expanded={open} className={iconButton}>
          <motion.span animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : { rotate: 0 }} transition={{ duration: 0.9, delay: 0.6 }}>
            <Bell className="size-[19px]" />
          </motion.span>
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="absolute top-1 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-calendar px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-[var(--glass-bg-strong)]"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      }
    >
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-[16px] font-semibold text-ink">{t("title")}</h2>
        <span className="text-[12px] text-muted">{t("count", { count: items.length })}</span>
      </header>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink/5 text-muted">
            <BellOff className="size-5" />
          </span>
          <p className="text-[14px] font-medium text-ink">{t("emptyTitle")}</p>
          <p className="text-[13px] text-muted">{t("emptyBody")}</p>
        </div>
      ) : (
        <ul className="max-h-[min(440px,70svh)] overflow-y-auto px-2 pb-2">
          {items.map((n, i) => {
            const Icon = n.icon;
            const fresh = highlight.has(n.key);
            return (
              <motion.li key={n.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push(n.href);
                  }}
                  className={cn("flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/5", fresh && "bg-accent/6")}
                >
                  <span
                    className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
                    style={{ color: n.color, background: `color-mix(in srgb, ${n.color} 16%, transparent)` }}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">{n.title}</span>
                      {fresh && <span className="size-2 shrink-0 rounded-full bg-accent" />}
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-snug text-ink-2">{n.body}</span>
                    {n.showTime !== false && <span className="text-[11px] text-muted">{format.relativeTime(n.time, now)}</span>}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}

/** Avatar dengan menu: identitas, Pengaturan, Keluar. */
export function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Popover
      open={open}
      onClose={close}
      className="w-64"
      trigger={
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={user.name} aria-expanded={open} className="ml-1 rounded-full transition-transform active:scale-95">
          <Avatar name={user.name} image={user.image} className="size-9" />
        </button>
      }
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
        <Avatar name={user.name} image={user.image} className="size-10" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[12px] text-muted">{user.email}</p>
        </div>
      </div>
      <div className="p-1.5">
        <Link href="/dashboard/settings" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-ink/5">
          <Settings className="size-4 text-muted" />
          <span className="flex-1">{t("dashboard.nav.settings")}</span>
          <ChevronRight className="size-4 text-subtle" />
        </Link>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-calendar transition-colors hover:bg-calendar/10"
        >
          <LogOut className="size-4" />
          {t("common.logout")}
        </button>
      </div>
    </Popover>
  );
}
