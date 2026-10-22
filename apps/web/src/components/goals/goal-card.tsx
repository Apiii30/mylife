"use client";

import { PiggyBank } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { AnimatedNumber } from "@/components/finance/stat-tile";
import { LiquidProgress } from "@/components/ui/liquid-progress";
import { ModuleIcon } from "@/components/ui/module-icon";
import { categoryColor } from "@/config/categories";
import { goalIcon } from "@/config/goal-icons";
import { useGoalHelpers } from "@/hooks/use-goal-helpers";
import type { Goal } from "@/lib/queries/goals";
import { DeadlineChip, GoalBar, MilestoneList } from "./goal-parts";

type GoalCardProps = { goal: Goal; index: number; onOpen: () => void; onDeposit: () => void };

export function GoalCard({ goal, index, onOpen, onDeposit }: GoalCardProps) {
  const t = useTranslations("goals");
  const { money, perMonth } = useGoalHelpers();
  const color = categoryColor(goal.color);
  const done = goal.milestones.filter((m) => m.done).length;
  const next = goal.milestones.find((m) => !m.done);
  const monthly = perMonth(goal);

  return (
    <motion.article
      layoutId={`goal-${goal.id}`}
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      tabIndex={0}
      role="button"
      style={{ borderRadius: 24 }}
      className="group relative flex cursor-pointer flex-col overflow-hidden glass-card p-5 transition-shadow duration-500 outline-none hover:shadow-[0_24px_60px_-28px_rgb(0_0_0/0.3)] focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* Cahaya warna goal di pojok */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-60 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-35"
        style={{ background: color }}
      />

      <header className="relative flex items-start justify-between gap-3">
        <ModuleIcon icon={goalIcon(goal.icon)} color={color} size="md" />
        <DeadlineChip goal={goal} />
      </header>

      <div className="relative mt-3">
        <p className="text-[12px] font-semibold tracking-wide text-muted uppercase">{t(`types.${goal.type}.name`)}</p>
        <h3 className="mt-0.5 text-[18px] leading-tight font-semibold tracking-[-0.025em] text-ink">{goal.title}</h3>
        {goal.description && <p className="mt-1 line-clamp-1 text-[14px] text-muted">{goal.description}</p>}
      </div>

      {goal.type === "FINANCIAL" ? (
        <div className="relative mt-4 flex flex-1 items-center gap-4">
          <LiquidProgress value={goal.progress * 100} size={92} color={color} />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-muted">{t("card.saved")}</p>
            <AnimatedNumber value={goal.saved} format={money} className="block truncate text-[18px] font-semibold tracking-[-0.03em] text-ink" />
            <p className="truncate text-[13px] text-muted">
              {t("card.of")} {money(goal.targetAmount ?? 0)}
            </p>
            {goal.status === "ACTIVE" && goal.targetAmount && goal.saved < goal.targetAmount && (
              <p className="mt-1.5 text-[12px] font-medium text-ink-2">
                {t("card.remaining", { amount: money(goal.targetAmount - goal.saved) })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="relative mt-4 flex flex-1 flex-col">
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-ink-2">
              {goal.milestones.length ? t("card.steps", { done, total: goal.milestones.length }) : t("card.noSteps")}
            </span>
            <span className="font-semibold text-ink tabular-nums">{Math.round(goal.progress * 100)}%</span>
          </div>
          <GoalBar value={goal.progress} color={color} />
          {goal.milestones.length > 0 && (
            <div className="mt-3">
              <MilestoneList goal={goal} limit={3} />
            </div>
          )}
        </div>
      )}

      {goal.type === "FINANCIAL" && goal.status === "ACTIVE" && (
        <footer className="relative mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="min-w-0 text-[12px] leading-snug text-muted">{monthly ? t("card.perMonth", { amount: money(Math.ceil(monthly)) }) : null}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeposit();
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-[filter,transform] hover:brightness-110 active:scale-95"
            style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <PiggyBank className="size-4" />
            {t("card.deposit")}
          </button>
        </footer>
      )}
      {goal.type === "LIFE" && next && goal.status === "ACTIVE" && goal.milestones.length > 3 && (
        <p className="relative mt-3 truncate text-[12px] text-muted">
          {t("card.next")}: <span className="font-medium text-ink-2">{next.title}</span>
        </p>
      )}
    </motion.article>
  );
}
