import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GalleryView } from "@/components/gallery/gallery-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gallery");
  return { title: t("title") };
}

export default async function GalleryPage({ searchParams }: PageProps<"/dashboard/gallery">) {
  const { album, photo } = await searchParams;
  return <GalleryView initialAlbumId={typeof album === "string" ? album : undefined} initialPhotoId={typeof photo === "string" ? photo : undefined} />;
}
