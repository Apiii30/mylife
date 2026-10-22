import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BalanceWidget, CashflowWidget, SpendingWidget } from "@/components/dashboard/finance-widgets";
import { EventsWidget } from "@/components/dashboard/events-widget";
import { GoalsWidget } from "@/components/dashboard/goals-widget";
import { GradesWidget } from "@/components/dashboard/grades-widget";
import { JournalWidget } from "@/components/dashboard/journal-widget";
import { MemoriesWidget } from "@/components/dashboard/memories-widget";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { currentMonthKey } from "@/lib/month";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("overview") };
}

export default async function OverviewPage() {
  const month = currentMonthKey();

  return (
    <>
      <div className="grid gap-4 pt-1 md:grid-cols-2 lg:grid-cols-3">
        <BalanceWidget month={month} index={0} />

        <GoalsWidget index={1} />

        <CashflowWidget month={month} index={2} />
        <SpendingWidget month={month} index={3} />

        <TasksWidget index={4} />

        <EventsWidget index={5} />

        <JournalWidget index={6} />

        <GradesWidget index={7} />
        <MemoriesWidget index={8} />
      </div>
    </>
  );
}
