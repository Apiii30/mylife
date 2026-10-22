"use client";

import { CalendarClock, Trophy, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { categoryColor } from "@/config/categories";
import { useGoalHelpers } from "@/hooks/use-goal-helpers";
import { cn } from "@/lib/cn";
import { useDeleteMilestone, useToggleMilestone, type Goal } from "@/lib/queries/goals";

export function DeadlineChip({ goal }: { goal: Goal }) {
  const t = useTranslations("goals.card");
  const { daysLeft } = useGoalHelpers();

  if (goal.status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-finance/12 px-2.5 py-1 text-[12px] font-semibold text-finance">
        <Trophy className="size-3.5" />
        {t("reached")}
      </span>
    );
  }
  const days = daysLeft(goal);
  if (days === null) return <span className="text-[12px] text-muted">{t("noDeadline")}</span>;
  const late = days < 0;
  const soon = days >= 0 && days <= 14;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium tabular-nums",
        late ? "bg-calendar/12 text-calendar" : soon ? "bg-journal/14 text-journal" : "bg-ink/5 text-ink-2",
      )}
    >
      <CalendarClock className="size-3.5" />
      {late ? t("overdue", { days: -days }) : t("daysLeft", { days })}
    </span>
  );
}

/** Daftar langkah goal kehidupan; bisa dicentang (dan dihapus di panel detail). */
export function MilestoneList({ goal, limit, editable }: { goal: Goal; limit?: number; editable?: boolean }) {
  const toggle = useToggleMilestone();
  const remove = useDeleteMilestone();
  const color = categoryColor(goal.color);
  const items = limit ? goal.milestones.slice(0, limit) : goal.milestones;

  return (
    <ul className="flex flex-col">
      <AnimatePresence initial={false}>
        {items.map((m, i) => (
          <motion.li
            key={m.id}
            layout="position"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="group relative"
          >
            {/* Garis penghubung antar langkah */}
            {i < items.length - 1 && (
              <span className="absolute top-8 bottom-0 left-[11px] w-0.5 rounded-full bg-ink/8">
                <motion.span
                  className="block h-full w-full origin-top rounded-full"
                  style={{ background: color }}
                  initial={false}
                  animate={{ scaleY: m.done && items[i + 1]?.done ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            )}
            <div className="flex items-center gap-3 py-1.5" onClick={(e) => e.stopPropagation()}>
              <TaskCheckbox
                checked={m.done}
                color={color}
                label={m.title}
                onToggle={() => toggle.mutate({ goalId: goal.id, milestoneId: m.id, done: !m.done })}
              />
              <motion.span
                initial={false}
                animate={{ color: m.done ? "var(--muted)" : "var(--ink)" }}
                className={cn("min-w-0 flex-1 truncate text-[14px] font-medium", m.done && "line-through decoration-muted/60")}
              >
                {m.title}
              </motion.span>
              {editable && (
                <button
                  type="button"
                  onClick={() => remove.mutate({ goalId: goal.id, milestoneId: m.id })}
                  aria-label="×"
                  className="grid size-7 place-items-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink/5 hover:text-calendar focus-visible:opacity-100 max-sm:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Bar progres dengan kilau cair. */
export function GoalBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-ink/6", className)}>
      <motion.div
        className="relative h-full overflow-hidden rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="animate-shimmer absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgb(255_255_255/0.45)_50%,transparent_75%)] bg-[length:200%_100%]" />
      </motion.div>
    </div>
  );
}
