"use client";

import { AlignLeft, CalendarDays, Flag, Loader } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { categoryColor } from "@/config/categories";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/queries/tasks";
import { TaskCheckbox } from "./task-checkbox";

type TaskRowProps = {
  task: Task;
  overdue: boolean;
  dueLabel: string | null;
  onToggle: () => void;
  onOpen: () => void;
  compact?: boolean;
};

export function TaskRow({ task, overdue, dueLabel, onToggle, onOpen, compact }: TaskRowProps) {
  const t = useTranslations("tasks");
  const done = task.status === "DONE";
  const color = task.category ? categoryColor(task.category.color) : "var(--c-tasks)";

  return (
    <div className={cn("group flex items-start gap-3", compact ? "px-1 py-2" : "px-4 py-3")}>
      <TaskCheckbox checked={done} color={color} onToggle={onToggle} label={task.title} className="mt-px" />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="relative inline-block max-w-full">
          <motion.span
            initial={false}
            animate={{ color: done ? "var(--muted)" : "var(--ink)" }}
            className={cn("block truncate font-medium", compact ? "text-[14px]" : "text-[15px]")}
          >
            {task.title}
          </motion.span>
          <motion.span
            aria-hidden
            className="absolute top-1/2 left-0 h-[1.5px] w-full origin-left bg-muted"
            initial={false}
            animate={{ scaleX: done ? 1 : 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: done ? 0.1 : 0 }}
          />
        </span>
        {(dueLabel || task.category || task.priority === "HIGH" || task.description || task.status === "IN_PROGRESS") && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted">
            {task.status === "IN_PROGRESS" && (
              <span className="flex items-center gap-1 font-medium text-tasks">
                <Loader className="size-3" />
                {t("status.IN_PROGRESS")}
              </span>
            )}
            {dueLabel && (
              <span className={cn("flex items-center gap-1", overdue && !done && "font-medium text-calendar")}>
                <CalendarDays className="size-3" />
                {dueLabel}
              </span>
            )}
            {task.priority === "HIGH" && !done && (
              <span className="flex items-center gap-1 font-medium text-calendar">
                <Flag className="size-3" fill="currentColor" />
                {t("priority.HIGH")}
              </span>
            )}
            {task.category && (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: color }} />
                {task.category.name}
              </span>
            )}
            {task.description && !compact && <AlignLeft className="size-3" aria-label={t("form.description")} />}
          </span>
        )}
      </button>
    </div>
  );
}
