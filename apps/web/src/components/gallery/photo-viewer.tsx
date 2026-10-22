"use client";

import { ChevronLeft, ChevronRight, Download, FolderInput, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/use-media-query";
import { cldUrl, cloudinaryLoader, downloadUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";
import type { Album, Photo } from "@/lib/queries/gallery";
import { THUMB_SIZES } from "./photo-grid";

const EASE = [0.16, 1, 0.3, 1] as const;
const CHROME = { x: 24, top: 76, bottom: 84 }; // ruang untuk bar atas & kolom keterangan

/** Ukuran panggung dari ukuran jendela — sudah tersedia di frame pertama, jadi morph tidak menuju kotak 0×0. */
function useStageSize() {
  const key = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange);
      return () => window.removeEventListener("resize", onChange);
    },
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => "0x0",
  );
  const [w, h] = key.split("x").map(Number);
  const pad = w >= 768 ? 96 : CHROME.x; // ruang tombol panah di desktop
  return { width: Math.max(0, w - pad * 2), height: Math.max(0, h - CHROME.top - CHROME.bottom) };
}

type PhotoViewerProps = {
  photos: Photo[];
  openId: string | null;
  albums: Album[];
  onChange: (id: string | null) => void;
  onCaption: (photo: Photo, caption: string | null) => void;
  onMove: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
};

export function PhotoViewer({ photos, openId, albums, onChange, onCaption, onMove, onDelete }: PhotoViewerProps) {
  const t = useTranslations("gallery");
  const format = useFormatter();
  const mounted = useMounted();
  const stage = useStageSize();
  // Morph dari/ke thumbnail hanya untuk foto yang pertama dibuka; navigasi memakai geser
  const [morph, setMorph] = useState(true);
  const [direction, setDirection] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const index = photos.findIndex((p) => p.id === openId);
  const photo = index >= 0 ? photos[index] : null;
  const album = albums.find((a) => a.id === photo?.albumId);

  function go(delta: number) {
    const next = photos[index + delta];
    if (!next) return;
    setMorph(false);
    setDirection(delta);
    setConfirmDelete(false);
    onChange(next.id);
  }

  function close() {
    onChange(null);
  }

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Escape") onChange(null);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  });

  // Muat foto sebelah lebih dulu agar geser terasa instan
  useEffect(() => {
    if (!stage.width) return;
    for (const p of [photos[index - 1], photos[index + 1]]) if (p) new window.Image().src = cldUrl(p.url, { width: Math.min(2400, stage.width * 2) });
  }, [index, photos, stage.width]);

  if (!mounted) return null;

  // Ukuran foto yang pas di panggung (object-contain manual, agar morph dari thumbnail akurat)
  const fit = photo && stage.width ? Math.min(stage.width / photo.width, stage.height / photo.height, 1.5) : 0;
  const box = photo ? { width: photo.width * fit, height: photo.height * fit } : { width: 0, height: 0 };

  return createPortal(
    <AnimatePresence onExitComplete={() => setMorph(true)}>
      {photo && (
        <motion.div
          className="fixed inset-0 z-[55] flex flex-col text-white"
          role="dialog"
          aria-modal="true"
          aria-label={t("viewer")}
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/92 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={close}
          />

          {/* Bar atas */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative z-10 flex items-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 sm:px-5"
          >
            <button type="button" onClick={close} aria-label={t("close")} className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <X className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">
                {format.dateTime(new Date(photo.takenAt ?? photo.createdAt), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="truncate text-[12px] text-white/60 tabular-nums">
                {format.dateTime(new Date(photo.takenAt ?? photo.createdAt), { hour: "2-digit", minute: "2-digit" })} · {index + 1}/{photos.length}
                {album && ` · ${album.name}`}
              </p>
            </div>
            <a
              href={downloadUrl(photo.url)}
              download
              aria-label={t("download")}
              title={t("download")}
              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-white/15"
            >
              <Download className="size-[18px]" />
            </a>
            <button type="button" onClick={() => onMove(photo)} aria-label={t("moveToAlbum")} title={t("moveToAlbum")} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-white/15">
              <FolderInput className="size-[18px]" />
            </button>
            <motion.button
              type="button"
              layout
              onClick={() => (confirmDelete ? onDelete(photo) : setConfirmDelete(true))}
              aria-label={t("delete")}
              className={cn("flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors", confirmDelete ? "bg-calendar" : "hover:bg-white/15")}
            >
              <Trash2 className="size-[18px]" />
              {confirmDelete && <span className="whitespace-nowrap">{t("confirmDelete")}</span>}
            </motion.button>
          </motion.header>

          {/* Panggung foto */}
          <div className="pointer-events-none relative flex flex-1 items-center justify-center">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={photo.id}
                layoutId={morph ? `photo-${photo.id}` : undefined}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d * 120, opacity: 0, scale: 0.96 }),
                  center: { x: 0, opacity: 1, scale: 1 },
                  exit: (d: number) => ({ x: d * -120, opacity: 0, scale: 0.96 }),
                }}
                initial={morph ? false : "enter"}
                animate="center"
                exit={morph ? undefined : "exit"}
                transition={{ type: "spring", stiffness: 320, damping: 36 }}
                drag
                dragSnapToOrigin
                dragElastic={0.6}
                dragDirectionLock
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 700) close();
                  else if (info.offset.x < -80 || info.velocity.x < -600) go(1);
                  else if (info.offset.x > 80 || info.velocity.x > 600) go(-1);
                }}
                className="pointer-events-auto relative shrink-0 cursor-grab touch-none overflow-hidden rounded-[6px] active:cursor-grabbing"
                style={box}
              >
                {fit > 0 && (
                  <Image loader={cloudinaryLoader} src={photo.url} alt="" fill aria-hidden draggable={false} sizes={THUMB_SIZES} className="object-contain select-none" />
                )}
                {fit > 0 && (
                  <Image
                    loader={cloudinaryLoader}
                    src={photo.url}
                    alt={photo.caption ?? ""}
                    fill
                    priority
                    draggable={false}
                    sizes={`${Math.ceil(box.width)}px`}
                    className="object-contain select-none"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {index > 0 && (
              <NavButton side="left" label={t("previous")} onClick={() => go(-1)} />
            )}
            {index < photos.length - 1 && (
              <NavButton side="right" label={t("next")} onClick={() => go(1)} />
            )}
          </div>

          {/* Keterangan */}
          <motion.footer
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative z-10 flex justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <CaptionInput key={photo.id} photo={photo} onSave={(caption) => onCaption(photo, caption)} />
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function NavButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "pointer-events-auto absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20 md:grid",
        side === "left" ? "left-5" : "right-5",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function CaptionInput({ photo, onSave }: { photo: Photo; onSave: (caption: string | null) => void }) {
  const t = useTranslations("gallery");
  const [value, setValue] = useState(photo.caption ?? "");
  const save = () => {
    const next = value.trim() || null;
    if (next !== photo.caption) onSave(next);
  };
  return (
    <input
      value={value}
      maxLength={500}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") e.stopPropagation();
      }}
      placeholder={t("addCaption")}
      aria-label={t("caption")}
      className="h-11 w-full max-w-xl rounded-full bg-white/10 px-5 text-center text-[15px] text-white backdrop-blur-md transition-colors outline-none placeholder:text-white/45 focus:bg-white/15"
    />
  );
}
