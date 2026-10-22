import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JournalView } from "@/components/journal/journal-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("journal");
  return { title: t("title") };
}

export default function JournalPage() {
  return <JournalView />;
}
