"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useMediaQuery, useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** Modal kaca di desktop, bottom sheet yang bisa di-swipe di ponsel. */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const mounted = useMounted();
  const desktop = useMediaQuery("(min-width: 640px)");
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={desktop ? { opacity: 0, scale: 0.94, y: 16, filter: "blur(10px)" } : { y: "100%" }}
              animate={desktop ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" } : { y: 0 }}
              exit={desktop ? { opacity: 0, scale: 0.96, y: 8, filter: "blur(6px)" } : { y: "100%" }}
              transition={desktop ? { duration: 0.45, ease: EASE } : { type: "spring", stiffness: 380, damping: 38 }}
              drag={desktop ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              dragListener={!desktop}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) onClose();
              }}
              className={cn(
                "glass glass-strong pointer-events-auto flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-[32px] sm:max-w-[480px] sm:rounded-[32px]",
                className,
              )}
            >
              <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
              <header className="flex shrink-0 items-center justify-between px-6 pt-4 pb-2 sm:pt-6">
                <h2 id={titleId} className="text-[19px] font-semibold tracking-[-0.02em] text-ink">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid size-8 place-items-center rounded-full bg-ink/6 text-ink-2 transition-colors hover:bg-ink/10"
                >
                  <X className="size-4" />
                </button>
              </header>
              <div className="overflow-y-auto overscroll-contain px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
