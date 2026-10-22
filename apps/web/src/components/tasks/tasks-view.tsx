"use client";

import { ChevronDown, Columns3, List, ListChecks, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModuleIcon } from "@/components/ui/module-icon";
import { ProgressRing } from "@/components/ui/progress-ring";
import { categoryColor } from "@/config/categories";
import { useTaskHelpers } from "@/hooks/use-task-helpers";
import { cn } from "@/lib/cn";
import { useCategories } from "@/lib/queries/finance";
import { useCreateTask, useTasks, type Task, type TaskStatus } from "@/lib/queries/tasks";
import { dueToIso, GROUP_ORDER, taskGroup, type TaskGroup } from "@/lib/task-dates";
import { TaskBoard } from "./task-board";
import { TaskDialog, type TaskDefaults } from "./task-dialog";
import { TaskRow } from "./task-row";

type Filter = "all" | "today" | "upcoming" | "overdue" | "done";
const FILTER_GROUPS: Record<Filter, TaskGroup[]> = {
  all: GROUP_ORDER,
  today: ["overdue", "today"],
  upcoming: ["tomorrow", "week", "later"],
  overdue: ["overdue"],
  done: ["done"],
};
const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const EASE = [0.16, 1, 0.3, 1] as const;

function sortTasks(tasks: Task[], group: TaskGroup) {
  return [...tasks].sort((a, b) => {
    if (group === "done") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    const due = (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9");
    if (due) return due;
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.position - b.position;
  });
}

export function TasksView() {
  const t = useTranslations("tasks");
  const { data: tasks, isLoading } = useTasks();
  const { data: categories = [] } = useCategories("TASK");
  const { today, dueLabel, isOverdue, toggle, todayProgress } = useTaskHelpers();

  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim().toLowerCase());
  const [showDone, setShowDone] = useState(false);
  // Tugas yang baru dicentang "tinggal" sebentar di grupnya agar animasi selesai terlihat
  const [lingering, setLingering] = useState<string[]>([]);

  function toggleTask(task: Task) {
    if (task.status !== "DONE") {
      setLingering((ids) => [...ids, task.id]);
      setTimeout(() => setLingering((ids) => ids.filter((id) => id !== task.id)), 900);
    }
    toggle(task);
  }
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null; defaults?: TaskDefaults }>({ open: false, task: null });

  const visible = useMemo(
    () =>
      (tasks ?? []).filter(
        (task) => (!categoryId || task.category?.id === categoryId) && (!q || task.title.toLowerCase().includes(q)),
      ),
    [tasks, categoryId, q],
  );

  const grouped = useMemo(() => {
    const map = new Map<TaskGroup, Task[]>();
    for (const task of visible) {
      const group = taskGroup(lingering.includes(task.id) ? { ...task, status: "TODO" } : task, today);
      map.set(group, [...(map.get(group) ?? []), task]);
    }
    return map;
  }, [visible, today, lingering]);

  const progress = todayProgress(tasks ?? []);
  const activeCount = (tasks ?? []).filter((task) => task.status !== "DONE").length;
  const overdueCount = grouped.get("overdue")?.length ?? 0;
  const sections = FILTER_GROUPS[filter].filter((g) => grouped.get(g)?.length);

  const openNew = (defaults?: TaskDefaults) =>
    setDialog({ open: true, task: null, defaults: { categoryId, ...(filter === "today" && { dueDate: today }), ...defaults } });

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={ListChecks} color="var(--c-tasks)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">{t("active", { count: activeCount })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress.total > 0 && (
            <div className="flex items-center gap-2.5 rounded-full glass-card py-1 pr-4 pl-1">
              <ProgressRing value={progress.done / progress.total} size={34} stroke={4}>
                <span className="text-[9px] font-semibold text-ink tabular-nums">{Math.round((progress.done / progress.total) * 100)}%</span>
              </ProgressRing>
              <span className="text-[13px] font-medium text-ink-2">
                {progress.done === progress.total ? t("allDone") : t("progressToday", { done: progress.done, total: progress.total })}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 rounded-full bg-ink/5 p-1">
            {(["list", "board"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-label={t(`views.${v}`)}
                className={cn("relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium", view === v ? "text-ink" : "text-muted hover:text-ink")}
              >
                {view === v && (
                  <motion.span
                    layoutId="tasks-view"
                    className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {v === "list" ? <List className="relative size-4" /> : <Columns3 className="relative size-4" />}
                <span className="relative hidden sm:inline">{t(`views.${v}`)}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => openNew()} className="hidden md:inline-flex">
            <Plus className="size-4" strokeWidth={2.5} />
            {t("add")}
          </Button>
        </div>
      </header>

      {/* Filter */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {view === "list" &&
            (["all", "today", "upcoming", "overdue", "done"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                  filter === f ? "text-canvas" : "glass-card text-ink-2 hover:text-ink",
                )}
              >
                {filter === f && (
                  <motion.span layoutId="tasks-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <span className="relative">{t(`filters.${f}`)}</span>
                {f === "overdue" && overdueCount > 0 && (
                  <span className="relative rounded-full bg-calendar px-1.5 text-[11px] font-semibold text-white tabular-nums">{overdueCount}</span>
                )}
              </button>
            ))}
          {view === "list" && <span className="mx-1 w-px shrink-0 bg-line" />}
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(active ? null : c.id)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors",
                  active ? "text-ink ring-transparent" : "glass-card text-ink-2 ring-transparent hover:text-ink",
                )}
                style={active ? { background: `color-mix(in srgb, ${categoryColor(c.color)} 18%, var(--surface))` } : undefined}
              >
                <span className="size-2 rounded-full" style={{ background: categoryColor(c.color) }} />
                {c.name}
              </button>
            );
          })}
        </div>
        <label className="relative lg:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="h-10 w-full rounded-full glass-card pr-4 pl-9 text-[14px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60"
          />
        </label>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === "board" ? (
          <motion.div key="board" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
            <TaskBoard
              tasks={visible}
              isOverdue={isOverdue}
              dueLabel={dueLabel}
              onToggle={toggleTask}
              onOpen={(task) => setDialog({ open: true, task })}
              onAdd={(status: TaskStatus) => openNew({ status })}
            />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
            <QuickAdd categoryId={categoryId} dueDate={filter === "today" ? today : null} />

            {isLoading ? (
              <div className="mt-4 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-[20px] bg-ink/4" />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 rounded-[28px] border border-dashed border-line-strong px-6 py-14 text-center text-[15px] text-muted"
              >
                {t(`empty.${filter}`)}
              </motion.p>
            ) : (
              <div className="mt-6 flex flex-col gap-6">
                <AnimatePresence initial={false}>
                  {sections.map((group) => {
                    const items = sortTasks(grouped.get(group) ?? [], group);
                    const collapsible = group === "done" && filter !== "done";
                    const collapsed = collapsible && !showDone;
                    return (
                      <motion.section key={group} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                        <header className="mb-2 flex items-center gap-2 px-2">
                          <h2 className={cn("text-[14px] font-semibold", group === "overdue" ? "text-calendar" : "text-ink-2")}>{t(`groups.${group}`)}</h2>
                          <span className="text-[12px] text-muted tabular-nums">{items.length}</span>
                          {collapsible && (
                            <button
                              type="button"
                              onClick={() => setShowDone((v) => !v)}
                              className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-muted hover:bg-ink/5 hover:text-ink"
                            >
                              {collapsed ? t("showDone") : t("hideDone")}
                              <motion.span animate={{ rotate: collapsed ? 0 : 180 }}>
                                <ChevronDown className="size-3.5" />
                              </motion.span>
                            </button>
                          )}
                        </header>
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.ul
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.4, ease: EASE }}
                              className="overflow-hidden rounded-[22px] glass-card"
                            >
                              <AnimatePresence initial={false} mode="popLayout">
                                {items.map((task) => (
                                  <motion.li
                                    key={task.id}
                                    layout="position"
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 16, transition: { duration: 0.25 } }}
                                    transition={{ duration: 0.4, ease: EASE }}
                                    className="border-b border-line last:border-0"
                                  >
                                    <TaskRow
                                      task={task}
                                      overdue={isOverdue(task)}
                                      dueLabel={dueLabel(task)}
                                      onToggle={() => toggleTask(task)}
                                      onOpen={() => setDialog({ open: true, task })}
                                    />
                                  </motion.li>
                                ))}
                              </AnimatePresence>
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </motion.section>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        defaults={dialog.defaults}
        today={today}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </>
  );
}

/** Ketik judul → Enter. Kategori & tanggal mengikuti filter yang aktif. */
function QuickAdd({ categoryId, dueDate }: { categoryId: string | null; dueDate: string | null }) {
  const t = useTranslations("tasks");
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle("");
    create.mutate(
      { title: value, categoryId, ...(dueDate && { dueDate: dueToIso(dueDate), hasDueTime: false }) },
      { onError: () => toast.error(t("toast.error")) },
    );
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="glass flex h-14 items-center gap-3 rounded-[20px] px-4 focus-within:ring-2 focus-within:ring-accent/50">
      <motion.span animate={{ rotate: title ? 90 : 0, color: title ? "var(--c-tasks)" : "var(--muted)" }} className="grid">
        <Plus className="size-5" />
      </motion.span>
      <input
        ref={inputRef}
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("quickAdd")}
        aria-label={t("add")}
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
      />
      <AnimatePresence>
        {title && (
          <motion.kbd
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="hidden rounded-md bg-ink/6 px-2 py-0.5 font-sans text-[11px] font-medium text-muted sm:block"
          >
            Enter ↵
          </motion.kbd>
        )}
      </AnimatePresence>
    </form>
  );
}
