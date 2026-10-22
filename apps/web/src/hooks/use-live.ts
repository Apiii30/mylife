"use client";

import { useInView, useReducedMotion } from "motion/react";
import type { RefObject } from "react";

/**
 * true selama elemen terlihat di layar (dan user tidak memilih reduced motion).
 * Dipakai untuk menjeda animasi berulang yang sedang tidak terlihat agar halaman tetap ringan.
 */
export function useLive(ref: RefObject<Element | null>) {
  const reduce = useReducedMotion();
  return useInView(ref, { margin: "80px 0px" }) && !reduce;
}
