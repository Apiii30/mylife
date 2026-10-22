"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { cn } from "@/lib/cn";
import { useRecentPhotos } from "@/lib/queries/gallery";
import { EmptyState, Widget } from "./widget";

const SLOTS = 7; // 1 besar (2×2) + 6 kecil → grid 5 kolom × 2 baris pas penuh

/** Enam foto terbaru; foto pertama tampil lebih besar seperti "Featured" di Apple Photos. */
export function MemoriesWidget({ index }: { index: number }) {
  const t = useTranslations("dashboard.overview");
  const { data, isLoading } = useRecentPhotos(SLOTS);
  const photos = data?.photos ?? [];

  return (
    <Widget module="gallery" title={t("memories")} className="md:col-span-2" index={index}>
      {!isLoading && photos.length === 0 ? (
        <>
          <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {Array.from({ length: SLOTS }, (_, i) => (
              <div key={i} className="aspect-square rounded-2xl border border-dashed border-line-strong bg-ink/2 max-sm:[&:nth-child(n+5)]:hidden" />
            ))}
          </div>
          <EmptyState module="gallery" text={t("empty.memories")} cta={t("empty.memoriesCta")} />
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:grid-rows-2">
          {(isLoading ? Array.from({ length: SLOTS }, () => null) : photos).map((photo, i) => (
            <motion.div
              key={photo?.id ?? i}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.05 }}
              className={cn("relative aspect-square overflow-hidden rounded-2xl bg-ink/5", i === 0 && "col-span-2 row-span-2", !photo && "animate-pulse")}
            >
              {photo && (
                <Link href={`/dashboard/gallery?photo=${photo.id}`} className="group block size-full" aria-label={photo.caption ?? t("memories")}>
                  <Image
                    loader={cloudinaryLoader}
                    src={photo.url}
                    alt={photo.caption ?? ""}
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 420px, 66vw" : "(min-width: 1024px) 210px, 33vw"}
                    className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
                  />
                  {photo.caption && i === 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-3 text-[13px] font-medium text-white">
                      {photo.caption}
                    </span>
                  )}
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </Widget>
  );
}
