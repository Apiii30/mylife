"use client";

import { useCallback, useState } from "react";

/** Mengukur tinggi elemen secara live (untuk animasi tinggi yang mulus). */
export function useMeasuredHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState<number | "auto">("auto");
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

/** Mengukur lebar elemen secara live (untuk grafik SVG yang responsif). */
export function useMeasuredWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0);
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Mengukur lebar & tinggi elemen secara live. */
export function useMeasuredSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((node: T | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
