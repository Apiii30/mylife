"use client";

import { ChevronLeft, FolderInput, ImagePlus, Images, MoreHorizontal, Pencil, SquareCheckBig, Trash2, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { useMounted } from "@/hooks/use-media-query";
import { usePhotoUploader } from "@/hooks/use-photo-uploader";
import { cn } from "@/lib/cn";
import { useAlbums, useDeletePhotos, useMovePhotos, usePhotos, useUpdatePhoto, type Album, type Photo } from "@/lib/queries/gallery";
import { AlbumFormDialog, AlbumGrid, AlbumPickerDialog, DeleteAlbumDialog } from "./albums";
import { PhotoGrid } from "./photo-grid";
import { PhotoViewer } from "./photo-viewer";
import { DropOverlay, UploadTray } from "./upload-parts";

type Tab = "photos" | "albums";

export function GalleryView({ initialAlbumId, initialPhotoId }: { initialAlbumId?: string; initialPhotoId?: string }) {
  const t = useTranslations("gallery");
  const mounted = useMounted();
  const fileInput = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>(initialAlbumId ? "albums" : "photos");
  const [albumId, setAlbumId] = useState<string | null>(initialAlbumId ?? null);
  const [openId, setOpenId] = useState<string | null>(initialPhotoId ?? null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState<{ open: boolean; ids: string[]; currentId?: string | null }>({ open: false, ids: [] });
  const [albumForm, setAlbumForm] = useState<{ open: boolean; album: Album | null }>({ open: false, album: null });
  const [deleting, setDeleting] = useState(false);
  const [menu, setMenu] = useState(false);

  const { data: albums = [] } = useAlbums();
  const album = albums.find((a) => a.id === albumId) ?? null;
  const showingPhotos = tab === "photos" || Boolean(albumId);
  const list = usePhotos(tab === "photos" ? null : albumId);
  const photos = useMemo(() => list.data?.pages.flatMap((p) => p.photos) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  const uploader = usePhotoUploader(albumId);
  const updatePhoto = useUpdatePhoto();
  const deletePhotos = useDeletePhotos();
  const movePhotos = useMovePhotos();

  // Infinite scroll
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, showingPhotos]);

  // URL mengikuti album & foto yang terbuka (bisa dibagikan / dibuka dari Ringkasan)
  function syncUrl(next: { album?: string | null; photo?: string | null }) {
    const params = new URLSearchParams();
    if (next.album) params.set("album", next.album);
    if (next.photo) params.set("photo", next.photo);
    window.history.replaceState(null, "", params.size ? `?${params}` : window.location.pathname);
  }

  function openAlbum(next: Album | null) {
    setAlbumId(next?.id ?? null);
    exitSelect();
    syncUrl({ album: next?.id });
  }

  function viewPhoto(id: string | null) {
    setOpenId(id);
    syncUrl({ album: albumId, photo: id });
  }

  function exitSelect() {
    setSelecting(false);
    setSelected(new Set());
  }

  function toggle(photo: Photo) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });
  }

  async function upload(files: File[]) {
    const count = await uploader.upload(files);
    if (count) toast.success(t("upload.toast", { count }));
  }

  function removePhotos(ids: string[]) {
    if (openId && ids.includes(openId)) {
      // Pindah ke foto sebelah sebelum menghapus yang sedang dilihat
      const index = photos.findIndex((p) => p.id === openId);
      const neighbour = photos[index + 1] ?? photos[index - 1];
      viewPhoto(neighbour && !ids.includes(neighbour.id) ? neighbour.id : null);
    }
    deletePhotos.mutate(ids, {
      onSuccess: () => toast.success(t("toast.deleted", { count: ids.length })),
      onError: () => toast.error(t("toast.error")),
    });
    exitSelect();
  }

  function move(target: { id: string; name: string } | null) {
    const ids = picker.ids;
    setPicker({ open: false, ids: [] });
    movePhotos.mutate(
      { ids, albumId: target?.id ?? null },
      {
        onSuccess: () => toast.success(target ? t("toast.moved", { count: ids.length, album: target.name }) : t("toast.removed", { count: ids.length })),
        onError: () => toast.error(t("toast.error")),
      },
    );
    exitSelect();
  }

  const subtitle = album ? t("photos", { count: album.count }) : t("summary", { photos: total, albums: albums.length });

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {album ? (
              <motion.button
                key="back"
                type="button"
                onClick={() => openAlbum(null)}
                aria-label={t("albums.back")}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="grid size-12 place-items-center rounded-[14px] bg-ink/5 text-ink transition-colors hover:bg-ink/10"
              >
                <ChevronLeft className="size-6" />
              </motion.button>
            ) : (
              <motion.span key="icon" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <ModuleIcon icon={Images} color="var(--c-gallery)" size="lg" />
              </motion.span>
            )}
          </AnimatePresence>
          <div className="min-w-0">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h1
                key={album?.id ?? "root"}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                className="truncate text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink"
              >
                {album?.name ?? t("title")}
              </motion.h1>
            </AnimatePresence>
            <p className="truncate text-[14px] text-muted">{album?.description || subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showingPhotos && photos.length > 0 && (
            <Button variant="ghost" onClick={() => (selecting ? exitSelect() : setSelecting(true))}>
              {selecting ? <X className="size-4" /> : <SquareCheckBig className="size-4" />}
              {selecting ? t("select.cancel") : t("select.start")}
            </Button>
          )}
          {album && (
            <div className="relative">
              <Button variant="ghost" onClick={() => setMenu((m) => !m)} aria-label={t("albums.menu")} aria-expanded={menu}>
                <MoreHorizontal className="size-4" />
              </Button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="glass glass-strong absolute right-0 z-30 mt-2 w-52 origin-top-right overflow-hidden rounded-2xl p-1.5"
                    onMouseLeave={() => setMenu(false)}
                  >
                    <MenuItem icon={Pencil} label={t("albums.rename")} onClick={() => { setMenu(false); setAlbumForm({ open: true, album }); }} />
                    <MenuItem icon={Trash2} label={t("albums.delete")} danger onClick={() => { setMenu(false); setDeleting(true); }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <Button onClick={() => fileInput.current?.click()} style={{ background: "var(--c-gallery)" }}>
            <Upload className="size-4" />
            {t("upload.button")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              if (files.length) void upload(files);
            }}
          />
        </div>
      </header>

      {!album && (
        <div className="mb-6 inline-grid grid-cols-2 rounded-full bg-ink/5 p-1">
          {(["photos", "albums"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                exitSelect();
              }}
              className={cn("relative flex h-9 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-medium", tab === key ? "text-ink" : "text-muted hover:text-ink")}
            >
              {tab === key && (
                <motion.span
                  layoutId="gallery-tab"
                  className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{t(`tabs.${key}`)}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={showingPhotos ? `photos-${albumId}` : "albums"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          {!showingPhotos ? (
            <AlbumGrid albums={albums} onOpen={openAlbum} onCreate={() => setAlbumForm({ open: true, album: null })} />
          ) : list.isLoading ? (
            <div className="grid grid-cols-3 gap-1 md:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-[10px] bg-ink/5" style={{ animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <EmptyGallery inAlbum={Boolean(album)} onPick={() => fileInput.current?.click()} />
          ) : (
            <>
              <PhotoGrid photos={photos} selecting={selecting} selected={selected} onOpen={(p) => viewPhoto(p.id)} onToggle={toggle} />
              <div ref={sentinel} className="h-10">
                {isFetchingNextPage && <div className="mx-auto mt-4 size-5 animate-spin rounded-full border-2 border-gallery border-t-transparent" />}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bar aksi mode pilih */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {selecting && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="glass glass-strong fixed inset-x-4 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] z-40 mx-auto flex max-w-md items-center gap-2 rounded-full p-2 pl-5 md:bottom-6"
              >
                <span className="flex-1 text-[14px] font-semibold text-ink tabular-nums">{t("select.count", { count: selected.size })}</span>
                <Button size="sm" variant="ghost" disabled={!selected.size} onClick={() => setPicker({ open: true, ids: [...selected], currentId: albumId })}>
                  <FolderInput className="size-4" />
                  <span className="max-sm:hidden">{t("moveToAlbum")}</span>
                </Button>
                <Button size="sm" disabled={!selected.size} onClick={() => removePhotos([...selected])} style={{ background: "var(--c-calendar)" }}>
                  <Trash2 className="size-4" />
                  <span className="max-sm:hidden">{t("delete")}</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <PhotoViewer
        photos={photos}
        openId={openId}
        albums={albums}
        onChange={viewPhoto}
        onCaption={(photo, caption) => updatePhoto.mutate({ id: photo.id, caption }, { onError: () => toast.error(t("toast.error")) })}
        onMove={(photo) => setPicker({ open: true, ids: [photo.id], currentId: photo.albumId })}
        onDelete={(photo) => removePhotos([photo.id])}
      />
      <AlbumPickerDialog open={picker.open} currentId={picker.currentId} onClose={() => setPicker({ open: false, ids: [] })} onPick={move} />
      <AlbumFormDialog
        open={albumForm.open}
        album={albumForm.album}
        onClose={() => setAlbumForm((f) => ({ ...f, open: false }))}
        onSaved={(saved) => !albumForm.album && openAlbum(saved)}
      />
      <DeleteAlbumDialog
        open={deleting}
        album={album}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          setDeleting(false);
          openAlbum(null);
        }}
      />
      <DropOverlay onFiles={upload} />
      <UploadTray items={uploader.items} onClear={uploader.clear} />
    </>
  );
}

function MenuItem({ icon: Icon, label, danger, onClick }: { icon: typeof Pencil; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors", danger ? "text-calendar hover:bg-calendar/10" : "text-ink hover:bg-ink/5")}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function EmptyGallery({ inAlbum, onPick }: { inAlbum: boolean; onPick: () => void }) {
  const t = useTranslations("gallery");
  return (
    <motion.button
      type="button"
      onClick={onPick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
      className="group relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-[32px] border-2 border-dashed border-line-strong px-6 py-20 text-center transition-colors hover:border-gallery/50"
    >
      <div aria-hidden className="absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-35" style={{ background: "var(--c-gallery)" }} />
      <span className="relative grid size-16 place-items-center rounded-[20px] bg-gallery text-white shadow-[0_14px_30px_-10px_var(--c-gallery)] transition-transform duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:rotate-[-4deg]">
        <ImagePlus className="size-8" />
      </span>
      <span className="relative text-[20px] font-semibold tracking-[-0.02em] text-ink">{inAlbum ? t("empty.album") : t("empty.title")}</span>
      <span className="relative max-w-sm text-[14px] leading-relaxed text-muted">{t("empty.text")}</span>
    </motion.button>
  );
}
