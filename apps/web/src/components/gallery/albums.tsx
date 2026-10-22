"use client";

import { Check, FolderOpen, Images, LoaderCircle, Plus } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";
import { useAlbums, useDeleteAlbum, useSaveAlbum, type Album } from "@/lib/queries/gallery";

const EASE = [0.16, 1, 0.3, 1] as const;
const STACK = [
  { rotate: -7, x: -10, y: 6 },
  { rotate: 6, x: 10, y: 4 },
  { rotate: 0, x: 0, y: 0 },
];

/** Grid album: tiap kartu menampilkan tumpukan 3 foto terbaru yang "mekar" saat di-hover. */
export function AlbumGrid({ albums, onOpen, onCreate }: { albums: Album[]; onOpen: (album: Album) => void; onCreate: () => void }) {
  const t = useTranslations("gallery");
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
      <motion.button
        type="button"
        onClick={onCreate}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="group flex flex-col text-left"
      >
        <span className="grid aspect-square place-items-center rounded-[24px] border-2 border-dashed border-line-strong text-muted transition-colors group-hover:border-gallery/60 group-hover:text-gallery">
          <Plus className="size-8 transition-transform duration-500 ease-out-expo group-hover:rotate-90" />
        </span>
        <span className="mt-3 px-1 text-[15px] font-semibold text-ink">{t("albums.new")}</span>
      </motion.button>

      {albums.map((album, i) => (
        <motion.button
          key={album.id}
          type="button"
          onClick={() => onOpen(album)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: (i + 1) * 0.05 }}
          whileHover="hover"
          className="group flex flex-col text-left"
        >
          <span className="relative aspect-square">
            {album.cover.length === 0 ? (
              <span className="grid size-full place-items-center rounded-[24px] bg-ink/5 text-subtle">
                <Images className="size-8" />
              </span>
            ) : (
              [...album.cover].reverse().map((photo, j, arr) => {
                const pose = STACK[STACK.length - arr.length + j];
                const top = j === arr.length - 1;
                return (
                  <motion.span
                    key={photo.id}
                    className="absolute inset-0 overflow-hidden rounded-[24px] bg-ink/5 shadow-[0_10px_24px_-14px_rgb(0_0_0/0.45)] ring-1 ring-black/5"
                    initial={false}
                    variants={{ hover: top ? { scale: 1.03, y: -4 } : { rotate: pose.rotate * 1.8, x: pose.x * 1.8, y: pose.y, scale: 0.95 } }}
                    style={{ rotate: top ? 0 : pose.rotate, x: top ? 0 : pose.x * 0.6, scale: top ? 1 : 0.92 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <Image loader={cloudinaryLoader} src={photo.url} alt="" fill sizes="(min-width: 1024px) 240px, 45vw" className="object-cover" />
                  </motion.span>
                );
              })
            )}
          </span>
          <span className="mt-3 truncate px-1 text-[15px] font-semibold text-ink">{album.name}</span>
          <span className="px-1 text-[13px] text-muted tabular-nums">{t("photos", { count: album.count })}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ─── Dialog ────────────────────────────────────────────────

export function AlbumFormDialog({ open, album, onClose, onSaved }: { open: boolean; album?: Album | null; onClose: () => void; onSaved?: (album: Album) => void }) {
  const t = useTranslations("gallery.albums");
  return (
    <Dialog open={open} onClose={onClose} title={album ? t("rename") : t("new")}>
      <AlbumForm key={album?.id ?? "new"} album={album} onDone={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function AlbumForm({ album, onDone, onSaved }: { album?: Album | null; onDone: () => void; onSaved?: (album: Album) => void }) {
  const t = useTranslations("gallery.albums");
  const save = useSaveAlbum();
  const [name, setName] = useState(album?.name ?? "");
  const [description, setDescription] = useState(album?.description ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const saved = await save.mutateAsync({ id: album?.id, name: name.trim(), description: description.trim() || null });
      toast.success(album ? t("toast.updated") : t("toast.created"));
      onSaved?.(saved);
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label={t("name")} value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
      <Field label={t("description")} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" size="lg" disabled={!name.trim() || save.isPending} className="mt-2" style={{ background: "var(--c-gallery)" }}>
        {save.isPending ? <LoaderCircle className="size-5 animate-spin" /> : album ? t("save") : t("create")}
      </Button>
    </form>
  );
}

/** Pilih album tujuan untuk satu/beberapa foto (bisa sekalian membuat album baru). */
export function AlbumPickerDialog({
  open,
  currentId,
  onClose,
  onPick,
}: {
  open: boolean;
  currentId?: string | null;
  onClose: () => void;
  onPick: (album: { id: string; name: string } | null) => void;
}) {
  const t = useTranslations("gallery.albums");
  const { data: albums = [] } = useAlbums();
  const save = useSaveAlbum();
  const [name, setName] = useState("");

  async function createAndPick(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const album = await save.mutateAsync({ name: name.trim() }).catch(() => null);
    if (album) {
      setName("");
      onPick(album);
    }
  }

  const options = [{ id: null, name: t("none"), count: null as number | null }, ...albums.map((a) => ({ id: a.id as string | null, name: a.name, count: a.count }))];
  const pick = (option: (typeof options)[number]) => onPick(option.id ? { id: option.id, name: option.name } : null);

  return (
    <Dialog open={open} onClose={onClose} title={t("moveTitle")}>
      <ul className="-mx-2 flex flex-col">
        {options.map((option) => {
          const active = option.id === (currentId ?? null);
          return (
            <li key={option.id ?? "none"}>
              <button
                type="button"
                onClick={() => pick(option)}
                className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-ink/4", active && "bg-ink/4")}
              >
                <span className="grid size-9 place-items-center rounded-xl bg-gallery/12 text-gallery">
                  <FolderOpen className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{option.name}</span>
                {option.count !== null && <span className="text-[13px] text-muted tabular-nums">{option.count}</span>}
                {active && <Check className="size-4 text-gallery" strokeWidth={3} />}
              </button>
            </li>
          );
        })}
      </ul>
      <form onSubmit={createAndPick} className="mt-3 flex h-12 items-center gap-2 rounded-2xl bg-ink/4 pr-1.5 pl-4 focus-within:ring-2 focus-within:ring-gallery/50">
        <Plus className="size-4 text-muted" />
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("newPlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
        {name.trim() && (
          <Button type="submit" size="sm" disabled={save.isPending} style={{ background: "var(--c-gallery)" }}>
            {t("createAndMove")}
          </Button>
        )}
      </form>
    </Dialog>
  );
}

export function DeleteAlbumDialog({ open, album, onClose, onDeleted }: { open: boolean; album: Album | null; onClose: () => void; onDeleted: () => void }) {
  const t = useTranslations("gallery.albums");
  const remove = useDeleteAlbum();
  const [withPhotos, setWithPhotos] = useState(false);

  async function confirm() {
    if (!album) return;
    try {
      await remove.mutateAsync({ id: album.id, withPhotos });
      toast.success(t("toast.deleted"));
      onDeleted();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("deleteTitle", { name: album?.name ?? "" })}>
      <p className="text-[14px] leading-relaxed text-ink-2">{withPhotos ? t("deleteWithPhotos", { count: album?.count ?? 0 }) : t("deleteKeep")}</p>
      <Switch checked={withPhotos} onChange={setWithPhotos} label={t("alsoDeletePhotos")} color="var(--c-calendar)" className="mt-4" />
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {t("cancel")}
        </Button>
        <Button onClick={confirm} disabled={remove.isPending} className="flex-1" style={{ background: "var(--c-calendar)" }}>
          {remove.isPending ? <LoaderCircle className="size-4 animate-spin" /> : t("delete")}
        </Button>
      </div>
    </Dialog>
  );
}
