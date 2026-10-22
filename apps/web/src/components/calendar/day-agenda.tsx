"use client";

import { MapPin, Plus, Repeat, Target } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { TaskCheckbox } from "@/components/tasks/task-checkbox";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import { compareOccurrences, occursOn, type Occurrence } from "@/lib/calendar";
import { addDays } from "@/lib/month";
import { cn } from "@/lib/cn";
import { tintBg, tintText } from "./occurrence-chip";

const EASE = [0.16, 1, 0.3, 1] as const;

type DayAgendaProps = {
  day: string;
  today: string;
  occurrences: Occurrence[];
  onOpen: (occ: Occurrence) => void;
  onToggleTask: (occ: Occurrence) => void;
  onCreate: () => void;
  className?: string;
};

/** Daftar agenda untuk satu hari — panel samping di desktop, di bawah grid di ponsel. */
export function DayAgenda({ day: key, today, occurrences, onOpen, onToggleTask, onCreate, className }: DayAgendaProps) {
  const t = useTranslations("calendar");
  const { day, span } = useCalendarFormat();
  const items = occurrences.filter((o) => occursOn(o, key)).sort(compareOccurrences);
  const relative = key === today ? t("today") : key === addDays(today, 1) ? t("tomorrow") : key === addDays(today, -1) ? t("yesterday") : null;

  return (
    <section className={cn("flex flex-col rounded-[24px] glass-card p-4", className)}>
      <header className="flex items-start justify-between gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className={cn("text-[12px] font-semibold tracking-wide uppercase", key === today ? "text-calendar" : "text-muted")}>
              {relative ?? day(key, { weekday: "long" })}
            </p>
            <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
              {day(key, relative ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" })}
            </h2>
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          onClick={onCreate}
          aria-label={t("addOn")}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-calendar/10 text-calendar transition-colors hover:bg-calendar/15"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </button>
      </header>

      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={key}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="flex flex-col gap-1.5"
          >
            {items.length === 0 && (
              <motion.li
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-muted"
              >
                {t("noEvents")}
              </motion.li>
            )}
            {items.map((occ) => (
              <motion.li
                key={occ.key}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                className="group flex items-stretch gap-3 rounded-2xl p-2 transition-colors hover:bg-ink/3"
              >
                {occ.kind === "task" ? (
                  <TaskCheckbox checked={Boolean(occ.done)} color={occ.color} onToggle={() => onToggleTask(occ)} label={occ.title} className="mt-0.5 ml-1" />
                ) : occ.kind === "goal" ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg" style={{ background: tintBg(occ.color, 22), color: tintText(occ.color) }}>
                    <Target className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="w-1 shrink-0 rounded-full" style={{ background: occ.color }} />
                )}
                <button type="button" onClick={() => onOpen(occ)} className="min-w-0 flex-1 text-left">
                  <span className={cn("block truncate text-[14px] font-medium text-ink", occ.done && "text-muted line-through")}>{occ.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted tabular-nums">
                    <span>{span(occ, key)}</span>
                    {occ.repeat && occ.repeat !== "NONE" && (
                      <span className="flex items-center gap-1">
                        <Repeat className="size-3" />
                        {t(`repeatShort.${occ.repeat}`)}
                      </span>
                    )}
                    {occ.location && (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{occ.location}</span>
                      </span>
                    )}
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </section>
  );
}
