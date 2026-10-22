"use client";

import { useNow, useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { useDueLabel } from "@/hooks/use-due-label";
import { useUpdateTask, type Task } from "@/lib/queries/tasks";
import { localDateKey, taskGroup } from "@/lib/task-dates";

/** Hari ini, label tenggat, status terlambat, dan toggle selesai — dipakai halaman & widget. */
export function useTaskHelpers() {
  const t = useTranslations("tasks");
  const today = localDateKey(useNow({ updateInterval: 60_000 }));
  const label = useDueLabel(today);
  const update = useUpdateTask();

  const dueLabel = useCallback((task: Task) => (task.dueDate ? label(task.dueDate, task.hasDueTime) : null), [label]);
  const isOverdue = useCallback((task: Task) => taskGroup(task, today) === "overdue", [today]);
  const toggle = useCallback(
    (task: Task) =>
      update.mutate(
        { id: task.id, status: task.status === "DONE" ? "TODO" : "DONE" },
        { onError: () => toast.error(t("toast.error")) },
      ),
    [update, t],
  );

  /** Tugas yang "milik" hari ini: tenggat hari ini/terlambat, atau diselesaikan hari ini. */
  const todayProgress = useCallback(
    (tasks: Task[]) => {
      const relevant = tasks.filter((task) => {
        const group = taskGroup(task, today);
        if (group === "today" || group === "overdue") return true;
        if (task.status !== "DONE") return false;
        const doneToday = task.completedAt && localDateKey(new Date(task.completedAt)) === today;
        const dueToday = task.dueDate && localDateKey(new Date(task.dueDate)) <= today;
        return Boolean(doneToday && (dueToday || !task.dueDate));
      });
      return { total: relevant.length, done: relevant.filter((task) => task.status === "DONE").length, tasks: relevant };
    },
    [today],
  );

  return { today, dueLabel, isOverdue, toggle, todayProgress };
}
