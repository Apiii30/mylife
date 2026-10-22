"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoalBar } from "@/components/goals/goal-parts";
import { LiquidProgress } from "@/components/ui/liquid-progress";
import { ModuleIcon } from "@/components/ui/module-icon";
import { categoryColor } from "@/config/categories";
import { goalIcon } from "@/config/goal-icons";
import { useGoalHelpers } from "@/hooks/use-goal-helpers";
import { useGoals } from "@/lib/queries/goals";
import { EmptyState, Widget } from "./widget";

/** Goal aktif terdekat tenggatnya ditampilkan besar, sisanya sebagai bar. */
export function GoalsWidget({ index }: { index: number }) {
  const t = useTranslations("goals");
  const tOverview = useTranslations("dashboard.overview");
  const { data: goals } = useGoals();
  const { money, daysLeft } = useGoalHelpers();
  const active = (goals ?? []).filter((g) => g.status === "ACTIVE");
  const [featured, ...rest] = active;

  return (
    <Widget module="goals" title={tOverview("goals")} index={index}>
      {!featured ? (
        <EmptyState module="goals" text={tOverview("empty.goals")} cta={tOverview("empty.goalsCta")} />
      ) : (
        <div className="flex flex-1 flex-col">
          <Link href={`/dashboard/goals?goal=${featured.id}`} className="group flex flex-col items-center gap-3 rounded-[22px] py-2 text-center">
            <LiquidProgress value={featured.progress * 100} size={104} color={categoryColor(featured.color)} />
            <div>
              <p className="text-[15px] font-semibold text-ink group-hover:underline">{featured.title}</p>
              <p className="text-[12px] text-muted">
                {featured.type === "FINANCIAL"
                  ? `${money(featured.saved)} ${t("card.of")} ${money(featured.targetAmount ?? 0)}`
                  : t("card.steps", { done: featured.milestones.filter((m) => m.done).length, total: featured.milestones.length })}
                {daysLeft(featured) !== null && daysLeft(featured)! >= 0 && ` · ${t("card.daysLeft", { days: daysLeft(featured)! })}`}
              </p>
            </div>
          </Link>
          {rest.length > 0 && (
            <ul className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
              {rest.slice(0, 2).map((goal) => (
                <li key={goal.id}>
                  <Link href={`/dashboard/goals?goal=${goal.id}`} className="flex items-center gap-3">
                    <ModuleIcon icon={goalIcon(goal.icon)} color={categoryColor(goal.color)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex justify-between text-[13px]">
                        <span className="truncate font-medium text-ink">{goal.title}</span>
                        <span className="text-muted tabular-nums">{Math.round(goal.progress * 100)}%</span>
                      </div>
                      <GoalBar value={goal.progress} color={categoryColor(goal.color)} className="h-1.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Widget>
  );
}
