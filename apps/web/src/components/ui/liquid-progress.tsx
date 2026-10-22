"use client";

import { motion, useInView, useSpring, useTransform } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/cn";

/** Gelombang sinus selebar 2x kotak agar bisa digeser tanpa terlihat sambungannya. */
function wavePath(size: number, amplitude: number) {
  const wavelength = size / 1.5;
  let d = `M 0 ${amplitude}`;
  for (let x = 0; x <= size * 2 + wavelength; x += wavelength / 2) {
    const up = (x / (wavelength / 2)) % 2 === 0;
    d += ` Q ${x + wavelength / 4} ${up ? -amplitude : amplitude * 3} ${x + wavelength / 2} ${amplitude}`;
  }
  return `${d} V ${size * 2} H 0 Z`;
}

type LiquidProgressProps = {
  value: number; // 0–100
  color?: string; // variabel CSS, mis. "var(--c-goals)"
  size?: number;
  className?: string;
  label?: React.ReactNode;
};

/** Bola kaca berisi cairan yang naik sesuai progres — dengan dua lapis gelombang. */
export function LiquidProgress({ value, color = "var(--c-goals)", size = 160, className, label }: LiquidProgressProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  // Gelombang hanya bergerak saat bola terlihat
  const live = useLive(ref);
  const clipId = useId();
  const level = useSpring(0, { stiffness: 40, damping: 18 });
  const y = useTransform(level, (v) => size - (v / 100) * size);
  const percent = useTransform(level, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    if (inView) level.set(Math.max(0, Math.min(100, value)));
  }, [inView, value, level]);

  const amp = size * 0.035;
  const path = wavePath(size, amp);

  return (
    <div ref={ref} className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} />
          </clipPath>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill={color} fillOpacity={0.08} />
        <g clipPath={`url(#${clipId})`}>
          <motion.g style={{ y }}>
            <motion.path
              d={path}
              fill={color}
              fillOpacity={0.35}
              animate={live ? { x: [0, -size / 1.5] } : { x: 0 }}
              transition={live ? { duration: 3.2, ease: "linear", repeat: Infinity } : { duration: 0 }}
            />
            <motion.path
              d={path}
              fill={color}
              fillOpacity={0.85}
              animate={live ? { x: [-size / 3, -size / 3 - size / 1.5] } : { x: -size / 3 }}
              transition={live ? { duration: 2.1, ease: "linear", repeat: Infinity } : { duration: 0 }}
              style={{ y: amp }}
            />
          </motion.g>
        </g>
        {/* Pantulan kaca */}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill="none" stroke="var(--glass-rim)" strokeWidth={1.5} />
        <ellipse cx={size * 0.36} cy={size * 0.24} rx={size * 0.2} ry={size * 0.08} fill="white" fillOpacity={0.35} transform={`rotate(-30 ${size * 0.36} ${size * 0.24})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.div
            className={cn("font-semibold tracking-[-0.04em] tabular-nums", value >= 50 ? "text-white drop-shadow-[0_1px_8px_rgb(0_0_0/0.25)]" : "text-ink")}
            style={{ fontSize: size * 0.2 }}
          >
            {percent}
          </motion.div>
          {label && <div className={cn("text-[11px] font-medium", value >= 50 ? "text-white/85" : "text-ink-2")}>{label}</div>}
        </div>
      </div>
    </div>
  );
}
