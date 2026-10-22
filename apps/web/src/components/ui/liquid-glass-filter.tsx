"use client";

import { useEffect } from "react";

/**
 * Filter SVG untuk efek refraksi "liquid glass".
 * `backdrop-filter: url(#...)` saat ini hanya didukung Chromium, jadi atribut
 * `data-refract` di <html> hanya dipasang di sana. Browser lain tetap memakai blur biasa.
 */
export function LiquidGlassFilter() {
  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData
      ?.brands;
    const isChromium = brands?.some((b) => b.brand === "Chromium") ?? false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isChromium && !reduced) document.documentElement.dataset.refract = "";
  }, []);

  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
      <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="11" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="46" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
