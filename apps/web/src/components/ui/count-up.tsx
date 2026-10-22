"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

type CountUpProps = { value: number; format: (n: number) => string; duration?: number; className?: string };

/** Angka yang berhitung naik saat terlihat. Menulis langsung ke DOM agar tidak re-render. */
export function CountUp({ value, format, duration = 1.6, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        if (ref.current) ref.current.textContent = format(n);
      },
    });
    return () => controls.stop();
  }, [inView, value, duration, format]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
