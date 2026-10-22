"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { DashboardPreview } from "./dashboard-preview";
import { HeroFloaters } from "./hero-floaters";

function Line({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.24em] -mb-[0.24em]">
      <motion.span
        className={cn("block", className)}
        initial={{ y: "108%", rotate: 2, filter: "blur(12px)" }}
        animate={{ y: "0%", rotate: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1.2, ease: EASE_OUT_EXPO, delay },
});

export function Hero({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("landing.hero");
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Parallax: judul bergerak lebih lambat dari scroll sambil memudar & sedikit mengecil
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 260]);
  const titleScale = useTransform(scrollYProgress, [0, 0.6], [1, reduce ? 1 : 0.92]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const titleBlur = useTransform(scrollYProgress, [0, 0.45], ["blur(0px)", reduce ? "blur(0px)" : "blur(8px)"]);
  // Blur saat scroll hanya di desktop — mem-blur ulang teks raksasa tiap frame terlalu berat untuk ponsel
  const desktop = useMediaQuery("(min-width: 768px) and (pointer: fine)");
  // Kilau gradien judul dijeda setelah judul memudar (animasi background menggambar ulang tiap frame)
  const [past, setPast] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setPast(v > 0.5));

  return (
    <section ref={ref} className="relative isolate overflow-hidden pt-28 sm:pt-32">
      <HeroFloaters />

      <motion.div style={{ y: titleY, scale: titleScale, opacity: titleOpacity, filter: desktop ? titleBlur : undefined }} className="relative mx-auto max-w-6xl px-4 text-center will-change-transform sm:px-6">
        <motion.div {...fadeUp(0.2)} className="flex justify-center">
          <span className="glass glass-refract inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-2 text-[13px] font-medium text-ink-2">
            <LogoMark className="size-5" />
            {t("badge")}
          </span>
        </motion.div>

        {/* Ukuran mengikuti lebar & tinggi layar agar judul + tombol selalu muat di layar pertama */}
        <h1 className="mt-6 text-[clamp(2.75rem,min(6.4vw,10.5svh),6rem)] leading-[0.95] font-semibold tracking-[-0.05em] text-balance text-ink">
          <Line delay={0.3}>{t("line1")}</Line>
          <Line delay={0.42} className={cn("text-gradient-life animate-shimmer", (past || reduce) && "[animation-play-state:paused]")}>
            {t("line2")}
          </Line>
        </h1>

        <motion.p
          {...fadeUp(0.75)}
          className="mx-auto mt-6 max-w-xl text-[clamp(1.05rem,1.8vw,1.25rem)] leading-relaxed tracking-[-0.01em] text-balance text-muted"
        >
          {t("subtitle")}
        </motion.p>

        <motion.div {...fadeUp(0.9)} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={loggedIn ? "/dashboard" : "/register"} size="lg" className="group w-full sm:w-auto">
            {t("primary")}
            <ArrowRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
          </ButtonLink>
          <ButtonLink href="#features" variant="glass" size="lg" className="group w-full sm:w-auto">
            {t("secondary")}
            <ArrowDown className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-y-0.5" />
          </ButtonLink>
        </motion.div>
      </motion.div>

      <DashboardPreview />
    </section>
  );
}
