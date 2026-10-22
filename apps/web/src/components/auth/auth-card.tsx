"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ViewTransition } from "react";
import { Logo } from "@/components/ui/logo";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMeasuredHeight } from "@/hooks/use-measure";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/login", key: "login" },
  { href: "/register", key: "register" },
] as const;

export function AuthCard({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [measureRef, height] = useMeasuredHeight<HTMLDivElement>();

  return (
    <div className="relative z-10 flex min-h-svh flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6">
        <Link
          href="/"
          className="glass flex h-10 items-center gap-1.5 rounded-full pr-4 pl-3 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("auth.backHome")}
        </Link>
        <div className="glass flex items-center gap-0.5 rounded-full px-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1, ease: EASE_OUT_EXPO }}
          className="glass glass-strong w-full max-w-[420px] rounded-[36px] p-2"
        >
          <div className="rounded-[30px] px-5 pt-7 pb-6 sm:px-7">
            <div className="flex justify-center">
              <Link href="/" aria-label="MyLife">
                <ViewTransition name="brand-logo" share="morph" default="none">
                  <Logo />
                </ViewTransition>
              </Link>
            </div>

            {/* Tab Masuk / Daftar dengan indikator yang meluncur */}
            <nav className="relative mx-auto mt-6 grid w-full grid-cols-2 rounded-full bg-ink/5 p-1">
              {TABS.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    replace
                    className={cn(
                      "relative h-9 rounded-full text-center text-[14px] leading-9 font-medium transition-colors",
                      active ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="auth-tab"
                        className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_var(--line)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{t(`common.${tab.key}`)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Tinggi kartu "mengalir" mengikuti isi form */}
            <motion.div animate={{ height }} transition={{ duration: 0.55, ease: EASE_OUT_EXPO }} className="overflow-hidden">
              <div ref={measureRef} className="pt-6">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, x: pathname === "/register" ? 24 : -24, filter: "blur(6px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                >
                  {children}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
