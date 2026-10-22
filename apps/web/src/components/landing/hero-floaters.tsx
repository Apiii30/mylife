"use client";

import { Check, Flame, GraduationCap, TrendingUp, type LucideIcon } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { useLive } from "@/hooks/use-live";
import { demoMoney } from "@/lib/format";

type Floater = {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  className: string; // posisi
  depth: number; // makin besar = makin "dekat" → bergeser lebih jauh
  rotate: number;
};

/**
 * Kartu kaca kecil yang melayang di sekitar judul hero. Tiap kartu ada di "kedalaman" berbeda:
 * saat di-scroll & saat kursor bergerak, kartu yang dekat bergeser lebih jauh → efek parallax 3D.
 */
export function HeroFloaters() {
  const t = useTranslations("landing.floaters");
  const money = demoMoney(useLocale());
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const live = useLive(ref);
  const { scrollY } = useScroll();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 60, damping: 18 });
  const y = useSpring(py, { stiffness: 60, damping: 18 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * 2);
      py.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, px, py]);

  const floaters: Floater[] = [
    { icon: TrendingUp, color: "var(--c-finance)", label: t("income"), value: `+${money(6_500_000)}`, className: "top-[22%] left-[3%]", depth: 1.1, rotate: -6 },
    { icon: Check, color: "var(--c-tasks)", label: t("task"), value: t("taskValue"), className: "top-[62%] left-[6%]", depth: 0.6, rotate: 4 },
    { icon: Flame, color: "var(--c-journal)", label: t("streak"), value: t("streakValue"), className: "top-[19%] right-[4%]", depth: 0.8, rotate: 5 },
    { icon: GraduationCap, color: "var(--c-grades)", label: t("gpa"), value: "3.67", className: "top-[58%] right-[5%]", depth: 1.3, rotate: -4 },
  ];

  return (
    // Hanya menutupi area judul (bukan preview dashboard di bawahnya), dan hanya di layar lebar agar tidak menabrak judul
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-[min(100svh,880px)] xl:block">
      {floaters.map((f, i) => (
        <FloatCard key={f.label} floater={f} index={i} scrollY={scrollY} x={x} y={y} still={Boolean(reduce)} bob={live} />
      ))}
    </div>
  );
}

function FloatCard({
  floater,
  index,
  scrollY,
  x,
  y,
  still,
  bob,
}: {
  floater: Floater;
  index: number;
  scrollY: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  still: boolean;
  bob: boolean;
}) {
  const { icon: Icon, color, label, value, className, depth, rotate } = floater;
  const tx = useTransform(x, (v) => (still ? 0 : v * 26 * depth));
  const ty = useTransform([y, scrollY], ([pv, sv]: number[]) => (still ? 0 : pv * 20 * depth - sv * 0.45 * depth));
  const rot = useTransform(scrollY, (v) => rotate + (still ? 0 : v * 0.012 * depth * Math.sign(rotate)));

  return (
    <motion.div className={`absolute ${className}`} style={{ x: tx, y: ty, rotate: rot }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.3, ease: EASE_OUT_EXPO, delay: 1.1 + index * 0.12 }}
      >
        <motion.div
          animate={bob ? { y: [0, -8, 0] } : { y: 0 }}
          transition={bob ? { duration: 5 + index, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
          className="glass glass-strong flex items-center gap-3 rounded-[20px] py-3 pr-5 pl-3"
        >
          <span className="grid size-10 place-items-center rounded-[14px]" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
            <Icon className="size-5" strokeWidth={2.2} />
          </span>
          <span className="text-left">
            <span className="block text-[11px] font-medium text-muted">{label}</span>
            <span className="block text-[15px] font-semibold tracking-[-0.01em] text-ink tabular-nums">{value}</span>
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
