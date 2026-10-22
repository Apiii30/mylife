"use client";

import { useRef } from "react";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/cn";
import { softGlow } from "@/lib/glow";

type AuroraProps = { className?: string; intensity?: "hero" | "soft" };

/** Latar gradien cair yang terus bergerak — animasi CSS transform saja agar ringan. */
export function Aurora({ className, intensity = "hero" }: AuroraProps) {
  const soft = intensity === "soft";
  const ref = useRef<HTMLDivElement>(null);
  // Animasi dijeda saat aurora tidak terlihat; will-change menjaga skala tidak memicu raster ulang
  const live = useLive(ref);
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden [&>div]:will-change-transform", !live && "[&>div]:[animation-play-state:paused]", className)}
      style={{ opacity: soft ? "calc(var(--aurora-opacity) * 0.6)" : "var(--aurora-opacity)" }}
    >
      <div className="animate-aurora-1 absolute top-[-18%] left-[8%] h-[62vmax] w-[62vmax]" style={{ background: softGlow("var(--c-tasks)", 68) }} />
      <div className="animate-aurora-2 absolute top-[2%] right-[-12%] h-[55vmax] w-[55vmax]" style={{ background: softGlow("var(--c-gallery)", 66) }} />
      <div className="animate-aurora-3 absolute bottom-[-30%] left-[-10%] h-[58vmax] w-[58vmax]" style={{ background: softGlow("var(--c-finance)", 66) }} />
      <div className="animate-aurora-2 absolute right-[18%] bottom-[-26%] h-[46vmax] w-[46vmax] opacity-70 [animation-delay:-9s]" style={{ background: softGlow("var(--c-journal)", 66) }} />
      <div className="animate-aurora-1 absolute top-[20%] left-[36%] h-[40vmax] w-[40vmax] opacity-80 [animation-delay:-14s]" style={{ background: softGlow("var(--c-goals)", 66) }} />
    </div>
  );
}
