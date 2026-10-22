import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FinanceView } from "@/components/finance/finance-view";
import { currentMonthKey, isMonthKey } from "@/lib/month";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("finance");
  return { title: t("title") };
}

export default async function FinancePage({ searchParams }: PageProps<"/dashboard/finance">) {
  const { month } = await searchParams;
  const current = currentMonthKey();
  const initial = isMonthKey(month) && month <= current ? month : current;

  return <FinanceView initialMonth={initial} currentMonth={current} />;
}
