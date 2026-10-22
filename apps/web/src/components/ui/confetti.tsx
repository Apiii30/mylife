"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/use-media-query";
import { onCelebrate } from "@/lib/celebrate";

type Piece = { id: number; x: number; peak: number; drift: number; rotate: number; size: number; round: boolean; color: string; delay: number; duration: number };

const DEFAULT_COLORS = ["var(--c-tasks)", "var(--c-gallery)", "var(--c-journal)", "var(--c-finance)", "var(--c-goals)", "var(--c-yellow)"];

/** Hujan confetti satu layar penuh, dipicu lewat `celebrate()`. */
export function ConfettiLayer() {
  const mounted = useMounted();
  const [burst, setBurst] = useState<{ key: number; pieces: Piece[] } | null>(null);

  useEffect(
    () =>
      onCelebrate((colors) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const palette = colors.length ? colors : DEFAULT_COLORS;
        const key = Date.now();
        const pieces = Array.from({ length: 110 }, (_, id) => ({
          id,
          x: 50 + (Math.random() - 0.5) * 30,
          peak: 25 + Math.random() * 35,
          drift: (Math.random() - 0.5) * 70,
          rotate: (Math.random() - 0.5) * 1080,
          size: 6 + Math.random() * 6,
          round: Math.random() > 0.6,
          color: palette[id % palette.length],
          delay: Math.random() * 0.15,
          duration: 1.9 + Math.random() * 1.1,
        }));
        setBurst({ key, pieces });
        setTimeout(() => setBurst((b) => (b?.key === key ? null : b)), 3400);
      }),
    [],
  );

  if (!mounted) return null;

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <AnimatePresence>
        {burst?.pieces.map((p) => (
          <motion.span
            key={`${burst.key}-${p.id}`}
            className="absolute"
            style={{
              left: `${p.x}vw`,
              top: "100vh",
              width: p.size,
              height: p.round ? p.size : p.size * 1.6,
              borderRadius: p.round ? 999 : 2,
              background: p.color,
            }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: ["0vh", `-${100 - p.peak + 20}vh`, "10vh"],
              x: ["0vw", `${p.drift * 0.6}vw`, `${p.drift}vw`],
              rotate: p.rotate,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: p.duration, delay: p.delay, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }}
          />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
