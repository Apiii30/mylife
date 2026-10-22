import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoalsView } from "@/components/goals/goals-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("goals");
  return { title: t("title") };
}

export default async function GoalsPage({ searchParams }: PageProps<"/dashboard/goals">) {
  const { goal } = await searchParams;
  return <GoalsView initialGoalId={typeof goal === "string" ? goal : undefined} />;
}
