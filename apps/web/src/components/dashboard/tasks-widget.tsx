"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskRow } from "@/components/tasks/task-row";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useTaskHelpers } from "@/hooks/use-task-helpers";
import { useTasks, type Task } from "@/lib/queries/tasks";
import { EmptyState, Widget } from "./widget";

/** Tugas yang tenggatnya hari ini / terlambat, bisa langsung dicentang dari ringkasan. */
export function TasksWidget({ index }: { index: number }) {
  const t = useTranslations("tasks");
  const tOverview = useTranslations("dashboard.overview");
  const { data: tasks } = useTasks();
  const { today, dueLabel, isOverdue, toggle, todayProgress } = useTaskHelpers();
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const progress = todayProgress(tasks ?? []);
  // Belum selesai di atas (terlambat dulu), yang sudah selesai di bawah
  const items = [...progress.tasks]
    .sort((a, b) => Number(a.status === "DONE") - Number(b.status === "DONE") || (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  return (
    <Widget module="tasks" title={tOverview("todayTasks")} index={index}>
      {progress.total === 0 ? (
        <EmptyState module="tasks" text={tOverview("empty.tasks")} cta={tOverview("empty.tasksCta")} />
      ) : (
        <>
          <div className="mb-2 flex items-center gap-3">
            <ProgressRing value={progress.done / progress.total} size={40} stroke={4.5}>
              <span className="text-[11px] font-semibold text-ink tabular-nums">
                {progress.done}/{progress.total}
              </span>
            </ProgressRing>
            <p className="text-[13px] font-medium text-ink-2">
              {progress.done === progress.total ? t("allDone") : t("progressToday", { done: progress.done, total: progress.total })}
            </p>
          </div>
          <ul className="-mx-1">
            <AnimatePresence initial={false}>
              {items.map((task) => (
                <motion.li key={task.id} layout="position" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                  <TaskRow
                    compact
                    task={task}
                    overdue={isOverdue(task)}
                    dueLabel={dueLabel(task)}
                    onToggle={() => toggle(task)}
                    onOpen={() => setDialog({ open: true, task })}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
      <TaskDialog open={dialog.open} task={dialog.task} today={today} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </Widget>
  );
}
