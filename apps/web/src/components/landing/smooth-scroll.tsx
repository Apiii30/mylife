"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Scroll halus bergaya Apple di landing page. Dimatikan jika user memilih reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, anchors: { offset: -80 }, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);
  return null;
}
