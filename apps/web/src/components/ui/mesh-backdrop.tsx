"use client";

import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect } from "react";

/**
 * Latar "mesh" lavender: gumpalan warna yang di-blur, bergerak parallax.
 * Tiap lapisan punya kedalaman berbeda — makin "dekat", makin jauh bergeser saat scroll & mengikuti kursor.
 */
const BLOBS = [
  { color: "var(--mesh-1)", size: "62vmax", top: "-22%", left: "-12%", depth: 0.35, drift: "animate-aurora-1" },
  { color: "var(--mesh-2)", size: "54vmax", top: "-8%", left: "52%", depth: 0.6, drift: "animate-aurora-2" },
  { color: "var(--mesh-3)", size: "46vmax", top: "48%", left: "62%", depth: 0.9, drift: "animate-aurora-3" },
  { color: "var(--mesh-4)", size: "50vmax", top: "58%", left: "-14%", depth: 0.5, drift: "animate-aurora-2" },
];

export function MeshBackdrop() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 40, damping: 20 });
  const y = useSpring(pointerY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      // -1…1 dari tengah layar
      pointerX.set((e.clientX / window.innerWidth - 0.5) * 2);
      pointerY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, pointerX, pointerY]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <div className="absolute inset-0" style={{ opacity: "var(--mesh-opacity)" }}>
        {BLOBS.map((blob, i) => (
          <Blob key={i} blob={blob} scrollY={scrollY} x={x} y={y} still={Boolean(reduce)} />
        ))}
      </div>
      {/* Butiran halus agar gradien tidak "banding" & terasa seperti kaca buram */}
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />
    </div>
  );
}

function Blob({
  blob,
  scrollY,
  x,
  y,
  still,
}: {
  blob: (typeof BLOBS)[number];
  scrollY: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  still: boolean;
}) {
  const scrollShift = useTransform(scrollY, (v) => (still ? 0 : -v * blob.depth * 0.35));
  const tx = useTransform(x, (v) => (still ? 0 : v * 40 * blob.depth));
  const ty = useTransform([y, scrollShift], ([py, s]: number[]) => (still ? 0 : py * 30 * blob.depth + s));

  return (
    <motion.div className="absolute" style={{ top: blob.top, left: blob.left, width: blob.size, height: blob.size, x: tx, y: ty }}>
      <div
        className={`${still ? "" : blob.drift} size-full rounded-full blur-[70px]`}
        style={{ background: `radial-gradient(circle at center, ${blob.color}, transparent 66%)` }}
      />
    </motion.div>
  );
}
