import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JournalEditor } from "@/components/journal/journal-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("journal");
  return { title: t("title") };
}

/** `/dashboard/journal/new?date=YYYY-MM-DD` untuk entri baru, selain itu id entri. */
export default async function JournalEntryPage({ params, searchParams }: PageProps<"/dashboard/journal/[id]">) {
  const { id } = await params;
  const { date } = await searchParams;
  const initialDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return <JournalEditor key={id} id={id === "new" ? null : id} initialDate={initialDate} />;
}
