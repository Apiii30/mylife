"use client";

import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Button } from "@/components/ui/button";
import { ModuleIcon } from "@/components/ui/module-icon";
import { ALL_LAYERS, rangeOf, useCalendarItems, type Layers } from "@/hooks/use-calendar-items";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import { useMediaQuery, useMounted } from "@/hooks/use-media-query";
import { useTaskHelpers } from "@/hooks/use-task-helpers";
import { keyToDate, monthGrid, occursOn, shiftEvent, weekKeys, type CalEvent, type Occurrence } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { addDays, monthDate, shiftMonth } from "@/lib/month";
import { useUpdateEvent } from "@/lib/queries/events";
import { useUpdateGoal } from "@/lib/queries/goals";
import { useUpdateTask, type Task } from "@/lib/queries/tasks";
import { addDaysKey, dueToIso, localDateKey } from "@/lib/task-dates";
import { DayAgenda } from "./day-agenda";
import { EventDialog, type EventDefaults } from "./event-dialog";
import { MonthGrid } from "./month-grid";
import { WeekGrid } from "./week-grid";

type View = "month" | "week";
const EASE = [0.16, 1, 0.3, 1] as const;

const LAYER_COLORS: Record<keyof Layers, string> = {
  events: "var(--c-calendar)",
  tasks: "var(--c-tasks)",
  goals: "var(--c-goals)",
};

export function CalendarView({ initialDate }: { initialDate?: string }) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const router = useRouter();
  const mounted = useMounted();
  const desktop = useMediaQuery("(min-width: 768px)");
  const { day } = useCalendarFormat();
  const { today, toggle } = useTaskHelpers();

  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState(initialDate ?? today);
  const [direction, setDirection] = useState(0);
  const [layers, setLayers] = useState<Layers>(ALL_LAYERS);
  const [dialog, setDialog] = useState<{ open: boolean; event: CalEvent | null; defaults?: EventDefaults }>({ open: false, event: null });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const month = selected.slice(0, 7);
  const week = useMemo(() => weekKeys(selected), [selected]);
  const visibleDays = useMemo(() => (view === "month" ? monthGrid(month).flat() : week), [view, month, week]);
  const range = rangeOf(visibleDays);
  const { occurrences, sources } = useCalendarItems(range.from, range.to, layers);

  const updateEvent = useUpdateEvent();
  const updateTask = useUpdateTask();
  const updateGoal = useUpdateGoal();

  // ─── Navigasi ───

  const select = useCallback(
    (key: string) => {
      setDirection(key > selected ? 1 : key < selected ? -1 : 0);
      setSelected(key);
    },
    [selected],
  );

  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      if (view === "week") return setSelected((s) => addDays(s, delta * 7));
      const next = shiftMonth(month, delta);
      setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
    },
    [view, month, today],
  );

  const openNew = useCallback(
    (defaults?: Partial<EventDefaults>) => setDialog({ open: true, event: null, defaults: { date: selected, ...defaults } }),
    [selected],
  );

  // Pintasan keyboard: ← → navigasi, T hari ini, N acara baru, M/W ganti tampilan
  const anyDialog = dialog.open || taskDialog.open;
  useEffect(() => {
    if (anyDialog) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      if (key === "arrowleft") go(-1);
      else if (key === "arrowright") go(1);
      else if (key === "t") select(today);
      else if (key === "n") openNew();
      else if (key === "m") setView("month");
      else if (key === "w") setView("week");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyDialog, go, select, today, openNew]);

  // ─── Aksi pada kemunculan ───

  function open(occ: Occurrence) {
    if (occ.kind === "event") {
      const event = sources.events.get(occ.id);
      if (event) setDialog({ open: true, event });
    } else if (occ.kind === "task") {
      const task = sources.tasks.get(occ.id);
      if (task) setTaskDialog({ open: true, task });
    } else router.push(`/dashboard/goals?goal=${occ.id}`);
  }

  function toggleTask(occ: Occurrence) {
    const task = sources.tasks.get(occ.id);
    if (task) toggle(task);
  }

  /** Pindahkan acara/tugas/tenggat goal, dengan tombol "Urungkan" di toast. */
  function move(occ: Occurrence, days: number, minutes = 0) {
    const fail = () => toast.error(t("toast.error"));
    let undo: (() => void) | null = null;

    if (occ.kind === "event") {
      const event = sources.events.get(occ.id);
      if (!event) return;
      updateEvent.mutate({ ...event, ...shiftEvent(event, days, minutes) }, { onError: fail });
      undo = () => updateEvent.mutate(event);
    } else if (occ.kind === "task") {
      const task = sources.tasks.get(occ.id);
      if (!task?.dueDate) return;
      const due = new Date(task.dueDate);
      due.setDate(due.getDate() + days);
      due.setMinutes(due.getMinutes() + minutes);
      const dueDate = task.hasDueTime ? due.toISOString() : dueToIso(addDaysKey(localDateKey(new Date(task.dueDate)), days));
      updateTask.mutate({ id: task.id, dueDate }, { onError: fail });
      undo = () => updateTask.mutate({ id: task.id, dueDate: task.dueDate });
    } else {
      const goal = sources.goals.get(occ.id);
      if (!goal?.deadline) return;
      updateGoal.mutate({ id: goal.id, deadline: addDays(goal.deadline, days) }, { onError: fail });
      undo = () => updateGoal.mutate({ id: goal.id, deadline: goal.deadline });
    }

    const target = keyToDate(addDays(occ.startKey, days), minutesOfOcc(occ) + minutes);
    toast.success(
      t("toast.moved", {
        date: format.dateTime(target, {
          weekday: "short",
          day: "numeric",
          month: "short",
          ...(!occ.allDay && { hour: "2-digit", minute: "2-digit" }),
          timeZone: deviceTz(),
        }),
      }),
      { action: { label: t("toast.undo"), onClick: () => undo?.() } },
    );
  }

  // ─── Ringkasan & judul ───

  const eventsInView = occurrences.filter((o) => o.kind === "event" && (view === "week" ? o.endKey >= week[0] && o.startKey <= week[6] : o.endKey >= `${month}-01` && o.startKey.slice(0, 7) <= month)).length;
  const title =
    view === "month" || !desktop
      ? format.dateTime(monthDate(month), { month: "long", year: "numeric", timeZone: "UTC" })
      : format.dateTimeRange(keyToDate(week[0]), keyToDate(week[6]), { day: "numeric", month: "short", year: "numeric", timeZone: deviceTz() });
  const titleKey = view === "month" || !desktop ? month : week[0];
  const isCurrent = view === "month" ? month === today.slice(0, 7) : week.includes(today);

  const dayOccurrences = (key: string) => occurrences.filter((o) => occursOn(o, key));

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={CalendarDays} color="var(--c-calendar)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">{t(view === "month" ? "summaryMonth" : "summaryWeek", { count: eventsInView })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid grid-cols-2 rounded-full bg-ink/5 p-1">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn("relative flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium", view === v ? "text-ink" : "text-muted hover:text-ink")}
              >
                {view === v && (
                  <motion.span
                    layoutId="calendar-view"
                    className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {v === "month" ? <LayoutGrid className="relative size-4" /> : <CalendarRange className="relative size-4" />}
                <span className="relative">{t(`views.${v}`)}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => openNew()} className="hidden md:inline-flex">
            <Plus className="size-4" strokeWidth={2.5} />
            {t("add")}
          </Button>
        </div>
      </header>

      {/* Toolbar: navigasi + lapisan */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 overflow-hidden sm:w-64 sm:flex-none">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.h2
                key={titleKey}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ y: d * 18, opacity: 0, filter: "blur(4px)" }),
                  center: { y: 0, opacity: 1, filter: "blur(0px)" },
                  exit: (d: number) => ({ y: d * -18, opacity: 0, filter: "blur(4px)" }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: EASE }}
                className="truncate text-[22px] font-semibold tracking-[-0.03em] text-ink capitalize"
              >
                {title}
              </motion.h2>
            </AnimatePresence>
          </div>
          <div className="flex h-10 items-center rounded-full glass-card p-1">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("prev")}
              className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => select(today)}
              disabled={isCurrent && selected === today}
              className="h-8 rounded-full px-3 text-[13px] font-medium text-ink transition-colors hover:bg-ink/5 disabled:text-muted"
            >
              {t("today")}
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("next")}
              className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5">
          {(Object.keys(LAYER_COLORS) as (keyof Layers)[]).map((layer) => {
            const on = layers[layer];
            return (
              <motion.button
                key={layer}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setLayers((l) => ({ ...l, [layer]: !l[layer] }))}
                aria-pressed={on}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ring-1 transition-colors",
                  on ? "glass-card text-ink ring-transparent" : "bg-transparent text-muted ring-line",
                )}
              >
                <motion.span
                  className="size-2.5 rounded-full border-2"
                  animate={{ backgroundColor: on ? LAYER_COLORS[layer] : "rgba(0,0,0,0)" }}
                  style={{ borderColor: LAYER_COLORS[layer] }}
                  transition={{ duration: 0.2 }}
                />
                {t(`layers.${layer}`)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          initial={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {view === "month" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <MonthGrid
                month={month}
                today={today}
                selected={selected}
                direction={direction}
                occurrences={occurrences}
                compact={!desktop}
                onSelect={select}
                onCreate={(date) => openNew({ date })}
                onOpen={open}
                onMove={(occ, days) => move(occ, days)}
                onSwipe={go}
              />
              <DayAgenda
                day={selected}
                today={today}
                occurrences={occurrences}
                onOpen={open}
                onToggleTask={toggleTask}
                onCreate={() => openNew()}
                className="xl:sticky xl:top-6 xl:self-start"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!desktop && <WeekStrip days={week} today={today} selected={selected} onSelect={select} hasItems={(key) => dayOccurrences(key).length > 0} />}
              <WeekGrid
                days={desktop ? week : [selected]}
                today={today}
                occurrences={occurrences}
                onOpen={open}
                onCreateAt={(date, minutes, allDay) => openNew({ date, minutes, allDay })}
                onMove={move}
                onSelectDay={select}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-4 hidden text-center text-[12px] text-subtle lg:block">{t("shortcuts")}</p>

      <EventDialog open={dialog.open} event={dialog.event} defaults={dialog.defaults} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
      <TaskDialog open={taskDialog.open} task={taskDialog.task} today={today} onClose={() => setTaskDialog((d) => ({ ...d, open: false }))} />

      {mounted &&
        createPortal(
          <AnimatePresence>
            {!anyDialog && (
              <motion.button
                type="button"
                onClick={() => openNew()}
                aria-label={t("add")}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="fixed right-5 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] z-30 grid size-14 place-items-center rounded-full bg-ink text-canvas shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] md:hidden"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>,
          document.body,
        )}
      <span className="sr-only" aria-live="polite">
        {day(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </span>
    </>
  );
}

const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const minutesOfOcc = (occ: Occurrence) => (occ.allDay ? 0 : occ.start.getHours() * 60 + occ.start.getMinutes());

/** Strip 7 hari untuk tampilan minggu di ponsel; pil terpilih meluncur antar hari. */
function WeekStrip({
  days,
  today,
  selected,
  onSelect,
  hasItems,
}: {
  days: string[];
  today: string;
  selected: string;
  onSelect: (key: string) => void;
  hasItems: (key: string) => boolean;
}) {
  const { day } = useCalendarFormat();
  return (
    <div className="grid grid-cols-7 gap-1 rounded-[22px] glass-card p-1.5">
      {days.map((key) => {
        const active = key === selected;
        const isToday = key === today;
        return (
          <button key={key} type="button" onClick={() => onSelect(key)} className="relative flex flex-col items-center gap-0.5 rounded-[16px] py-2">
            {active && (
              <motion.span
                layoutId="calendar-strip"
                className={cn("absolute inset-0 rounded-[16px]", isToday ? "bg-calendar" : "bg-ink")}
                transition={{ type: "spring", stiffness: 460, damping: 36 }}
              />
            )}
            <span className={cn("relative text-[10px] font-semibold uppercase", active ? (isToday ? "text-white/80" : "text-canvas/70") : isToday ? "text-calendar" : "text-muted")}>
              {day(key, { weekday: "short" })}
            </span>
            <span className={cn("relative text-[16px] font-semibold tabular-nums", active ? (isToday ? "text-white" : "text-canvas") : "text-ink")}>
              {Number(key.slice(8))}
            </span>
            <span className={cn("relative size-1 rounded-full", hasItems(key) ? (active ? (isToday ? "bg-white/80" : "bg-canvas/70") : "bg-muted") : "bg-transparent")} />
          </button>
        );
      })}
    </div>
  );
}
