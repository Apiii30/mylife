"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { useMeasuredWidth } from "@/hooks/use-measure";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";
import { justify } from "@/lib/justify";
import type { Photo } from "@/lib/queries/gallery";

const GAP = 4;
/** `sizes` tetap untuk thumbnail — dipakai juga oleh penampil agar gambar dari cache langsung muncul saat morph. */
export const THUMB_SIZES = "(min-width: 768px) 400px, 220px";

/** Kunci bulan foto berdasarkan tanggal diambil (zona waktu perangkat). */
const monthOf = (photo: Photo) => {
  const d = new Date(photo.takenAt ?? photo.createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type PhotoGridProps = {
  photos: Photo[];
  selecting: boolean;
  selected: Set<string>;
  onOpen: (photo: Photo) => void;
  onToggle: (photo: Photo) => void;
};

/** Foto per bulan dalam baris "justified" — rapat, rata kanan-kiri, tanpa memotong orientasi foto. */
export function PhotoGrid({ photos, selecting, selected, onOpen, onToggle }: PhotoGridProps) {
  const format = useFormatter();
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const desktop = useMediaQuery("(min-width: 768px)");
  const target = desktop ? 230 : 128;

  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const photo of photos) map.set(monthOf(photo), [...(map.get(monthOf(photo)) ?? []), photo]);
    return [...map.entries()].map(([month, items]) => ({ month, items, rows: width ? justify(items, width, target, GAP) : [] }));
  }, [photos, width, target]);

  let index = 0; // urutan global untuk stagger animasi masuk

  return (
    <div ref={ref} className="flex flex-col gap-8">
      {groups.map(({ month, items, rows }) => (
        <section key={month}>
          <h2 className="mb-3 flex items-baseline gap-2 px-1">
            <span className="text-[20px] font-semibold tracking-[-0.025em] text-ink capitalize">
              {format.dateTime(new Date(`${month}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" })}
            </span>
            <span className="text-[13px] text-muted tabular-nums">{items.length}</span>
          </h2>
          <div className="flex flex-col" style={{ gap: GAP }}>
            {rows.map((row, r) => (
              <div key={r} className="flex" style={{ gap: GAP, height: row.height }}>
                {row.items.map(({ item, width: w }) => (
                  <Thumb
                    key={item.id}
                    photo={item}
                    width={w}
                    height={row.height}
                    index={index++}
                    selecting={selecting}
                    selected={selected.has(item.id)}
                    onClick={() => (selecting ? onToggle(item) : onOpen(item))}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Thumb({
  photo,
  width,
  height,
  index,
  selecting,
  selected,
  onClick,
}: {
  photo: Photo;
  width: number;
  height: number;
  index: number;
  selecting: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("gallery");
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: Math.min(index, 24) * 0.02 }}
      aria-label={photo.caption ?? t("photo")}
      aria-pressed={selecting ? selected : undefined}
      className="group relative shrink-0 overflow-hidden rounded-[10px] bg-ink/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      style={{ width, height }}
    >
      <motion.div layoutId={`photo-${photo.id}`} className="absolute inset-0" transition={{ type: "spring", stiffness: 300, damping: 34 }}>
        <Image
          loader={cloudinaryLoader}
          src={photo.url}
          alt={photo.caption ?? ""}
          fill
          sizes={THUMB_SIZES}
          className={cn(
            "object-cover transition-transform duration-700 ease-out-expo",
            selecting ? (selected ? "scale-[0.86] rounded-[8px]" : "") : "group-hover:scale-[1.04]",
          )}
        />
      </motion.div>
      {photo.caption && !selecting && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/60 to-transparent px-2.5 pt-6 pb-2 text-left text-[12px] font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="line-clamp-2">{photo.caption}</span>
        </span>
      )}
      {selecting && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute top-2 right-2 grid size-6 place-items-center rounded-full border-2 shadow-sm",
            selected ? "border-white bg-accent text-white" : "border-white/90 bg-black/15",
          )}
        >
          {selected && <Check className="size-3.5" strokeWidth={3.5} />}
        </motion.span>
      )}
    </motion.button>
  );
}
