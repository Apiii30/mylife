"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type PopoverProps = {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** "end" (default): rata kanan dengan pemicu; "start": rata kiri — untuk pemicu di sisi kiri layar. */
  align?: "start" | "end";
};

const GAP = 10;
const EDGE = 12;

/**
 * Panel kaca yang mengembang dari tombol pemicunya; tutup dengan klik di luar atau Esc.
 * Di-portal ke body: top bar memakai backdrop-filter yang akan "menjebak" elemen fixed di dalamnya.
 */
export function Popover({ open, onClose, trigger, children, className, align = "end" }: PopoverProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      setPos(
        align === "start"
          ? { top: rect.bottom + GAP, left: Math.max(EDGE, rect.left) }
          : { top: rect.bottom + GAP, right: Math.max(EDGE, window.innerWidth - rect.right) },
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!anchor.current?.contains(target) && !panel.current?.contains(target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={anchor} className="relative">
      {trigger}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={panel}
                initial={{ opacity: 0, scale: 0.92, y: -6, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.96, y: -4, filter: "blur(4px)" }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                style={pos}
                className={cn(
                  "glass glass-strong fixed z-58 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[22px]",
                  align === "start" ? "origin-top-left" : "origin-top-right",
                  className,
                )}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
