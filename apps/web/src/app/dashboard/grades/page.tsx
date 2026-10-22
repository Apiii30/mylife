import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GradesView } from "@/components/grades/grades-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("grades");
  return { title: t("title") };
}

export default async function GradesPage({ searchParams }: PageProps<"/dashboard/grades">) {
  const { semester } = await searchParams;
  return <GradesView initialSemesterId={typeof semester === "string" ? semester : undefined} />;
}
