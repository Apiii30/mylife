"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Scroll halus bergaya Apple di landing page (mouse & trackpad). Dimatikan untuk reduced motion
 * dan layar sentuh — di sana scroll bawaan sudah halus, sementara Lenis tetap memutar loop rAF tanpa henti.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -80 }, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);
  return null;
}
