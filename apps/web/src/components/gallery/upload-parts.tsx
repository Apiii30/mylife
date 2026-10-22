"use client";

import { AlertCircle, Check, ImagePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useMounted } from "@/hooks/use-media-query";
import type { UploadItem } from "@/hooks/use-photo-uploader";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Kartu kaca di pojok: thumbnail + progres tiap file yang sedang diunggah. */
export function UploadTray({ items, onClear }: { items: UploadItem[]; onClear: () => void }) {
  const t = useTranslations("gallery.upload");
  const mounted = useMounted();
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const active = items.length - done - failed;
  const progress = items.length ? items.reduce((sum, i) => sum + (i.status === "done" ? 1 : i.progress * 0.95), 0) / items.length : 0;

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="glass glass-strong fixed right-4 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] z-40 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-[24px] md:right-6 md:bottom-6"
          role="status"
        >
          <header className="flex items-center gap-3 px-4 pt-4 pb-3">
            <ProgressRing value={progress} size={32} stroke={3.5} color="var(--c-gallery)">
              {active === 0 && <Check className="size-3.5 text-gallery" strokeWidth={3} />}
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{active ? t("uploading", { count: active }) : t("done", { count: done })}</p>
              {failed > 0 && <p className="text-[12px] text-calendar">{t("failed", { count: failed })}</p>}
            </div>
            {active === 0 && (
              <button type="button" onClick={onClear} aria-label={t("dismiss")} className="grid size-8 place-items-center rounded-full text-muted hover:bg-ink/6 hover:text-ink">
                <X className="size-4" />
              </button>
            )}
          </header>
          <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto px-2 pb-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
                <Preview src={item.preview} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{item.name}</p>
                  {item.status === "error" ? (
                    <p className="text-[11px] text-calendar">{t(`error.${item.error ?? "failed"}`)}</p>
                  ) : (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/8">
                      <motion.div
                        className="h-full rounded-full bg-gallery"
                        animate={{ width: `${(item.status === "done" ? 1 : item.progress) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
                <span className="grid size-5 place-items-center">
                  {item.status === "done" && <Check className="size-4 text-finance" strokeWidth={3} />}
                  {item.status === "error" && <AlertCircle className="size-4 text-calendar" />}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Pratinjau lokal; HEIC tak bisa ditampilkan browser, jadi diganti ikon. */
function Preview({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink/6 text-muted">
      <ImagePlus className="size-4" />
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL lokal, bukan untuk next/image
    <img src={src} alt="" onError={() => setBroken(true)} className="size-10 shrink-0 rounded-[10px] object-cover" />
  );
}

/** Lapisan "lepas untuk mengunggah" saat file diseret ke jendela. */
export function DropOverlay({ onFiles }: { onFiles: (files: File[]) => void }) {
  const t = useTranslations("gallery.upload");
  const mounted = useMounted();
  const [active, setActive] = useState(false);
  const depth = useRef(0);
  const handler = useRef(onFiles);
  useEffect(() => {
    handler.current = onFiles;
  });

  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setActive(true);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setActive(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) handler.current(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[65] grid place-items-center bg-black/25 p-6 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass glass-strong flex w-full max-w-md flex-col items-center gap-4 rounded-[36px] border-2 border-dashed border-gallery/60 px-8 py-14 text-center"
          >
            <motion.span
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="grid size-16 place-items-center rounded-[20px] bg-gallery text-white shadow-[0_14px_30px_-10px_var(--c-gallery)]"
            >
              <ImagePlus className="size-8" />
            </motion.span>
            <p className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("drop")}</p>
            <p className="text-[13px] text-muted">{t("hint")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
