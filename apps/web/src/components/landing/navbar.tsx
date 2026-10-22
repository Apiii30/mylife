"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, ViewTransition } from "react";
import { ButtonLink } from "@/components/ui/button";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { Logo } from "@/components/ui/logo";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

export function Navbar({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const links = [
    { href: "#features", label: t("landing.nav.features") },
    { href: "#goals", label: t("landing.nav.goals") },
    { href: "#why", label: t("landing.nav.why") },
  ];
  const compact = scrolled || open;

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: EASE_OUT_EXPO, delay: 0.15 }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4"
    >
      <nav
        className={cn(
          "relative mx-auto flex h-14 items-center justify-between rounded-full pr-2 pl-4 transition-[max-width] duration-700 ease-out-expo sm:pl-5",
          compact ? "max-w-[820px]" : "max-w-6xl",
        )}
      >
        {/* Lapisan kaca muncul saat halaman di-scroll */}
        <div
          aria-hidden
          className={cn(
            "glass glass-strong glass-refract absolute inset-0 rounded-full transition-opacity duration-500",
            compact ? "opacity-100" : "opacity-0",
          )}
        />

        <Link href="/" className="relative" aria-label="MyLife">
          <ViewTransition name="brand-logo" share="morph" default="none">
            <Logo />
          </ViewTransition>
        </Link>

        <ul className="relative hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-2 text-[14px] text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="relative flex items-center gap-1">
          <LocaleToggle className="hidden sm:flex" />
          <ThemeToggle />
          {loggedIn ? (
            <ButtonLink href="/dashboard" size="sm" className="ml-1 hidden sm:inline-flex">
              {t("common.openDashboard")}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("common.login")}
              </ButtonLink>
              <ButtonLink href="/register" size="sm" className="ml-1 hidden sm:inline-flex">
                {t("common.getStarted")}
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t("common.close") : t("common.menu")}
            className="grid size-9 place-items-center rounded-full text-ink hover:bg-ink/5 md:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "menu"}
                initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
                transition={{ duration: 0.2 }}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Menu ponsel: panel kaca yang "tumbuh" dari navbar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scaleY: 0.85, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scaleY: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scaleY: 0.9, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
            className="glass glass-strong mx-auto mt-2 max-w-[820px] origin-top rounded-[28px] p-3 md:hidden"
          >
            <ul className="flex flex-col">
              {links.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE_OUT_EXPO }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-[17px] font-medium text-ink hover:bg-ink/5"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-line px-2 pt-3">
              <LocaleToggle />
              <div className="flex gap-2">
                {loggedIn ? (
                  <ButtonLink href="/dashboard" size="sm">
                    {t("common.openDashboard")}
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login" variant="glass" size="sm">
                      {t("common.login")}
                    </ButtonLink>
                    <ButtonLink href="/register" size="sm">
                      {t("common.getStarted")}
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
