"use client";

import { PanelLeft } from "lucide-react";
import { animate, motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ConfettiLayer } from "@/components/ui/confetti";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { CommandPalette, SearchTrigger } from "./command-palette";
import { MobileNav } from "./mobile-nav";
import { Sidebar, SIDEBAR_WIDTH } from "./sidebar";
import { TopbarTitle } from "./topbar-title";
import { NotificationBell, UserMenu } from "./topbar-menus";

export type ShellUser = { name: string; email: string; image: string | null };

export const SIDEBAR_COOKIE = "mylife-sidebar";

/** Jarak sidebar ke tepi layar & ke konten (px) — sama dengan jarak top bar ke tepi atas. */
const GUTTER = 12;
const SPRING = { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } as const;

type ShellProps = { user: ShellUser; initialCollapsed: boolean; children: React.ReactNode };

export function DashboardShell({ user: initialUser, initialCollapsed, children }: ShellProps) {
  const t = useTranslations("dashboard.nav");
  const { data: session } = useSession();
  // Nama & foto mengikuti sesi agar perubahan di Pengaturan langsung terlihat
  const user: ShellUser = session?.user ? { name: session.user.name ?? "", email: session.user.email ?? "", image: session.user.image ?? null } : initialUser;

  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  // Satu sumber gerak: lebar sidebar menggerakkan offset konten & top bar secara bersamaan
  const width = useMotionValue(initialCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded);
  const offset = useTransform(width, (w) => `${w + GUTTER * 2}px`);
  useEffect(() => {
    const controls = animate(width, collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded, SPRING);
    return () => controls.stop();
  }, [collapsed, width]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Disimpan di cookie agar server langsung merender sidebar dengan lebar yang benar
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  // ⌘K / Ctrl+K membuka pencarian dari mana saja
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-svh">
      <MeshBackdrop />

      <Sidebar user={user} width={width} collapsed={collapsed} />

      <motion.div className="lg:pl-(--sidebar-offset)" style={{ "--sidebar-offset": offset } as never}>
        <div className="mx-auto w-full max-w-330 lg:mr-auto lg:ml-0 lg:pr-3">
          {/* Top bar: kaca mengambang, sejajar dengan baris logo di sidebar */}
          <header className="sticky top-0 z-30 px-3 pt-3 lg:px-0">
            <div
              className={cn(
                "glass glass-strong flex h-14 items-center gap-1.5 rounded-[22px] px-2 transition-shadow duration-500",
                scrolled && "shadow-[0_18px_40px_-20px_rgb(40_50_140/0.35)]",
              )}
            >
              <button
                type="button"
                onClick={toggle}
                aria-label={collapsed ? t("expand") : t("collapse")}
                title={collapsed ? t("expand") : t("collapse")}
                className="hidden size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink lg:grid"
              >
                <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={SPRING}>
                  <PanelLeft className="size-4.75" />
                </motion.span>
              </button>
              <TopbarTitle name={user.name} />
              <div className="flex shrink-0 items-center gap-0.5">
                <div className="mr-1.5 hidden md:block">
                  <SearchTrigger onOpen={() => setSearchOpen(true)} />
                </div>
                <div className="md:hidden">
                  <SearchTrigger compact onOpen={() => setSearchOpen(true)} />
                </div>
                <span aria-hidden className="mr-1.5 hidden h-6 w-px bg-line-strong md:block" />
                <LocaleToggle className="mr-1 hidden sm:flex" />
                <ThemeToggle />
                <NotificationBell />
                <UserMenu user={user} />
              </div>
            </div>
          </header>

          <main className="px-4 pt-3 pb-32 sm:px-6 lg:px-1 lg:pb-16">{children}</main>
        </div>
      </motion.div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileNav user={user} />
      <ConfettiLayer />
    </div>
  );
}
