"use client";

import { Clock, Flag, LoaderCircle, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { categoryColor } from "@/config/categories";
import { cn } from "@/lib/cn";
import { useCategories } from "@/lib/queries/finance";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/queries/tasks";
import { addDaysKey, dueToIso, localDateKey, localTimeKey } from "@/lib/task-dates";

export type TaskDefaults = { categoryId?: string | null; dueDate?: string | null; status?: TaskStatus };

type TaskDialogProps = {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaults?: TaskDefaults;
  today: string;
};

export function TaskDialog({ open, onClose, task, defaults, today }: TaskDialogProps) {
  const t = useTranslations("tasks");
  return (
    <Dialog open={open} onClose={onClose} title={task ? t("editTask") : t("newTask")}>
      <TaskForm key={task?.id ?? "new"} task={task} defaults={defaults} today={today} onDone={onClose} />
    </Dialog>
  );
}

function TaskForm({
  task,
  defaults,
  today,
  onDone,
}: {
  task?: Task | null;
  defaults?: TaskDefaults;
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("tasks");
  const create = useCreateTask();
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const { data: categories = [] } = useCategories("TASK");

  const initialDue = task?.dueDate ? new Date(task.dueDate) : null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(task ? (task.category?.id ?? null) : (defaults?.categoryId ?? null));
  const [date, setDate] = useState<string | null>(initialDue ? localDateKey(initialDue) : (defaults?.dueDate ?? null));
  const [time, setTime] = useState<string | null>(initialDue && task?.hasDueTime ? localTimeKey(initialDue) : null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaults?.status ?? "TODO");
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pending = create.isPending || update.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(true);
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      priority,
      status,
      dueDate: date ? dueToIso(date, time) : null,
      hasDueTime: Boolean(date && time),
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, ...body });
      else await create.mutateAsync(body);
      toast.success(task ? t("toast.updated") : t("toast.created"));
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  async function onDelete() {
    if (!task) return;
    if (!confirmDelete) return setConfirmDelete(true);
    onDone();
    remove.mutate(task.id, { onSuccess: () => toast.success(t("toast.deleted")) });
  }

  const quickDates = [
    { label: t("form.noDue"), value: null },
    { label: t("form.today"), value: today },
    { label: t("form.tomorrow"), value: addDaysKey(today, 1) },
    { label: t("form.nextWeek"), value: addDaysKey(today, 7) },
  ];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <input
          autoFocus
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(false);
          }}
          placeholder={t("form.title")}
          aria-label={t("form.title")}
          aria-invalid={error}
          className="w-full bg-transparent text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-ink/25"
        />
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[12px] text-calendar">
              {t("form.titleRequired")}
            </motion.p>
          )}
        </AnimatePresence>
        <textarea
          value={description}
          maxLength={2000}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form.description")}
          className="mt-2 w-full resize-none rounded-2xl bg-ink/4 px-4 py-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60"
          style={{ fieldSizing: "content", minHeight: 72 } as React.CSSProperties}
        />
      </div>

      {/* Kategori */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.category")}</p>
        <div className="flex flex-wrap gap-1.5">
          {[{ id: null, name: t("form.none"), color: null }, ...categories].map((c) => {
            const active = c.id === categoryId;
            const color = c.color ? categoryColor(c.color) : "var(--subtle)";
            return (
              <motion.button
                key={c.id ?? "none"}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                  active ? "text-white" : "bg-ink/5 text-ink-2 hover:bg-ink/8",
                )}
                style={active ? { background: color } : undefined}
              >
                {!active && <span className="size-2 rounded-full" style={{ background: color }} />}
                {c.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tenggat */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.due")}</p>
        <div className="flex flex-wrap gap-1.5">
          {quickDates.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setDate(q.value);
                if (!q.value) setTime(null);
              }}
              className={cn(
                "h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
                date === q.value ? "bg-ink text-canvas" : "bg-ink/5 text-ink-2 hover:bg-ink/8",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="date"
            value={date ?? ""}
            onChange={(e) => setDate(e.target.value || null)}
            aria-label={t("form.due")}
            className="h-11 min-w-0 flex-1 rounded-[14px] bg-ink/4 px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent/60"
          />
          {time !== null ? (
            <div className="flex h-11 items-center gap-1 rounded-[14px] bg-ink/4 pr-1 pl-3">
              <Clock className="size-4 text-muted" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label={t("form.time")}
                className="w-[5.5rem] bg-transparent text-[14px] text-ink outline-none"
              />
              <button type="button" onClick={() => setTime(null)} aria-label="×" className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!date}
              onClick={() => setTime("09:00")}
              className="h-11 rounded-[14px] bg-ink/4 px-4 text-[13px] font-medium text-ink-2 hover:bg-ink/7 disabled:opacity-40"
            >
              {t("form.addTime")}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("priority.label")}</p>
          <Segmented
            layoutId="task-priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: "LOW", label: t("priority.LOW") },
              { value: "MEDIUM", label: t("priority.MEDIUM") },
              { value: "HIGH", label: <><Flag className="size-3" fill="currentColor" />{t("priority.HIGH")}</>, tint: "var(--c-calendar)" },
            ]}
          />
        </div>
        {task && (
          <div>
            <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.status")}</p>
            <Segmented
              layoutId="task-status"
              value={status}
              onChange={setStatus}
              options={(["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => ({
                value: s,
                label: <span className="truncate px-1">{t(`statusShort.${s}`)}</span>,
              }))}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {task && (
          <motion.button
            type="button"
            layout
            onClick={onDelete}
            className={cn(
              "flex h-13 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-colors",
              confirmDelete ? "bg-calendar text-white" : "bg-calendar/10 text-calendar hover:bg-calendar/15",
            )}
          >
            <Trash2 className="size-4" />
            <AnimatePresence mode="popLayout" initial={false}>
              {confirmDelete && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {t("form.confirmDelete")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : t("form.save")}
        </Button>
      </div>
    </form>
  );
}
