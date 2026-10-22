import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarView } from "@/components/calendar/calendar-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default async function CalendarPage({ searchParams }: PageProps<"/dashboard/calendar">) {
  const { date } = await searchParams;
  const valid = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
  return <CalendarView initialDate={valid ? date : undefined} />;
}
