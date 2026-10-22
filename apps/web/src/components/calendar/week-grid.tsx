"use client";

import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/core";
import { Repeat } from "lucide-react";
import { motion } from "motion/react";
import { useNow, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import { keyToDate, layoutDay, layoutWeek, minutesOf, type Occurrence, type TimedPlacement } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { localDateKey } from "@/lib/task-dates";
import { ChipBody, isSpanning, TaskMark, tintBg, tintText } from "./occurrence-chip";

export const HOUR = 52; // px per jam
const SNAP = 15; // menit
const SNAP_PX = (HOUR * SNAP) / 60;
const ALL_DAY_LANES = 3;
const EASE = [0.16, 1, 0.3, 1] as const;

type WeekGridProps = {
  days: string[];
  today: string;
  occurrences: Occurrence[];
  onOpen: (occ: Occurrence) => void;
  onCreateAt: (day: string, minutes: number, allDay?: boolean) => void;
  onMove: (occ: Occurrence, days: number, minutes: number) => void;
  onSelectDay?: (day: string) => void;
};

type Drag = { key: string; days: number; minutes: number; dx: number };

export function WeekGrid({ days, today, occurrences, onOpen, onCreateAt, onMove, onSelectDay }: WeekGridProps) {
  const t = useTranslations("calendar");
  const { day, time } = useCalendarFormat();
  const now = useNow({ updateInterval: 60_000 });
  const scroller = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const allDay = useMemo(() => occurrences.filter(isSpanning), [occurrences]);
  const timed = useMemo(() => occurrences.filter((o) => !isSpanning(o)), [occurrences]);
  const lanes = useMemo(() => layoutWeek(days, allDay, ALL_DAY_LANES), [days, allDay]);
  const perDay = useMemo(() => days.map((d) => layoutDay(d, timed)), [days, timed]);

  // Buka di sekitar jam sekarang (atau 08.00) — bukan di tengah malam
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const minutes = days.includes(localDateKey(new Date())) ? minutesOf(new Date()) : 8 * 60;
    el.scrollTo({ top: Math.max(0, (minutes - 90) * (HOUR / 60)) });
  }, [days]);

  const snap = (delta: { x: number; y: number }) => {
    const width = (columns.current?.clientWidth ?? 1) / days.length;
    const dDays = Math.round(delta.x / width);
    return { days: dDays, minutes: Math.round(delta.y / SNAP_PX) * SNAP, dx: dDays * width };
  };

  function onDragMove({ active, delta }: DragMoveEvent) {
    const next = { key: String(active.id), ...snap(delta) };
    setDrag((d) => (d && d.key === next.key && d.days === next.days && d.minutes === next.minutes ? d : next));
  }

  function onDragEnd({ active, delta }: DragEndEvent) {
    setDrag(null);
    const { days: dDays, minutes } = snap(delta);
    if (dDays || minutes) onMove((active.data.current as { occ: Occurrence }).occ, dDays, minutes);
  }

  const nowMinutes = minutesOf(now);
  const todayIndex = days.indexOf(today);
  const cols = `52px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-[24px] glass-card">
      {/* Kepala hari (di ponsel sudah diwakili strip minggu) */}
      <div className={cn("grid border-b border-line", days.length === 1 && "hidden")} style={{ gridTemplateColumns: cols }}>
        <span />
        {days.map((key) => {
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay?.(key)}
              className="flex flex-col items-center gap-0.5 py-2.5 sm:flex-row sm:justify-center sm:gap-1.5"
            >
              <span className={cn("text-[11px] font-semibold uppercase", isToday ? "text-calendar" : "text-muted")}>
                {day(key, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-[15px] font-semibold tabular-nums",
                  isToday ? "bg-calendar text-white" : "text-ink",
                )}
              >
                {Number(key.slice(8))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Baris seharian */}
      <div className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
        <span className="self-center pr-2 text-right text-[10px] font-medium text-muted">{t("allDay")}</span>
        <div
          className="relative grid py-1"
          style={{
            gridColumn: `2 / span ${days.length}`,
            gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.max(1, Math.min(lanes.lanes, ALL_DAY_LANES))}, 20px) ${lanes.hidden.some(Boolean) ? "16px" : ""}`,
            rowGap: 2,
          }}
        >
          {days.map((key, i) => (
            <button
              key={key}
              type="button"
              aria-label={`${t("addOn")} ${key}`}
              onDoubleClick={() => onCreateAt(key, 0, true)}
              className={cn("row-span-full", i > 0 && "border-l border-line")}
              style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
            />
          ))}
          {lanes.placed.map((p) => (
            <button
              key={p.occ.key}
              type="button"
              onClick={() => onOpen(p.occ)}
              className={cn("relative h-5 min-w-0", p.clippedStart ? "ml-0" : "ml-1", p.clippedEnd ? "mr-0" : "mr-1")}
              style={{ gridColumn: `${p.col + 1} / span ${p.span}`, gridRow: p.lane + 1 }}
            >
              <ChipBody occ={p.occ} clippedStart={p.clippedStart} clippedEnd={p.clippedEnd} />
            </button>
          ))}
          {lanes.hidden.map((count, col) =>
            count ? (
              <button
                key={col}
                type="button"
                onClick={() => onSelectDay?.(days[col])}
                className="relative truncate px-1.5 text-left text-[10px] font-semibold text-muted hover:text-ink"
                style={{ gridColumn: col + 1, gridRow: ALL_DAY_LANES + 1 }}
              >
                {t("more", { count })}
              </button>
            ) : null,
          )}
        </div>
      </div>

      {/* Grid jam */}
      <DndContext sensors={sensors} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={() => setDrag(null)}>
        <div ref={scroller} className="h-[min(68svh,720px)] overflow-y-auto overscroll-contain">
          <div className="relative grid" style={{ gridTemplateColumns: cols, height: HOUR * 24 }}>
            {/* Label jam */}
            <div className="relative">
              {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
                <span
                  key={h}
                  className={cn(
                    "absolute right-2 -translate-y-1/2 text-[10.5px] font-medium text-muted tabular-nums transition-opacity",
                    todayIndex >= 0 && Math.abs(nowMinutes - h * 60) < 20 && "opacity-0",
                  )}
                  style={{ top: h * HOUR }}
                >
                  {time(keyToDate(today, h * 60))}
                </span>
              ))}
              {todayIndex >= 0 && (
                <span
                  className="absolute right-1.5 z-10 -translate-y-1/2 rounded-full bg-calendar px-1.5 py-px text-[10px] font-semibold text-white tabular-nums"
                  style={{ top: nowMinutes * (HOUR / 60) }}
                >
                  {time(now)}
                </span>
              )}
            </div>

            <div ref={columns} className="relative grid" style={{ gridColumn: `2 / span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {/* Garis jam */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {Array.from({ length: 23 }, (_, i) => (
                  <div key={i} className="absolute inset-x-0 border-t border-line" style={{ top: (i + 1) * HOUR }} />
                ))}
              </div>

              {days.map((key, i) => (
                <DayColumn
                  key={key}
                  day={key}
                  first={i === 0}
                  placements={perDay[i]}
                  drag={drag}
                  onOpen={onOpen}
                  onCreateAt={onCreateAt}
                />
              ))}

              {todayIndex >= 0 && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute z-20 h-0.5 bg-calendar"
                  style={{
                    top: nowMinutes * (HOUR / 60) - 1,
                    left: `${(todayIndex / days.length) * 100}%`,
                    width: `${100 / days.length}%`,
                  }}
                >
                  <span className="absolute top-1/2 -left-1 size-2.5 -translate-y-1/2 rounded-full bg-calendar" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function DayColumn({
  day,
  first,
  placements,
  drag,
  onOpen,
  onCreateAt,
}: {
  day: string;
  first: boolean;
  placements: TimedPlacement[];
  drag: Drag | null;
  onOpen: (occ: Occurrence) => void;
  onCreateAt: (day: string, minutes: number) => void;
}) {
  function create(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    onCreateAt(day, Math.floor(y / (HOUR / 2)) * 30);
  }

  return (
    <div onClick={create} className={cn("relative cursor-cell", !first && "border-l border-line")}>
      {placements.map((p) => (
        <TimedBlock key={p.occ.key} placement={p} drag={drag?.key === p.occ.key ? drag : null} onOpen={() => onOpen(p.occ)} />
      ))}
    </div>
  );
}

function TimedBlock({ placement, drag, onOpen }: { placement: TimedPlacement; drag: Drag | null; onOpen: () => void }) {
  const { occ, top, bottom, column, columns } = placement;
  const { time } = useCalendarFormat();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: occ.key, data: { occ } });
  const height = ((bottom - top) * HOUR) / 60;
  const short = bottom - top < 45;

  // Posisi saat diseret "menempel" ke kelipatan 15 menit & kolom hari
  const moved = drag ? new Date(occ.start.getTime() + drag.minutes * 60_000) : null;

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: isDragging ? 1.02 : 1 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-[8px] border-l-[3px] px-1.5 text-left",
        short ? "justify-center py-0" : "py-1",
        isDragging ? "z-30 cursor-grabbing shadow-[0_14px_30px_-10px_rgb(0_0_0/0.4)]" : "cursor-pointer hover:brightness-[0.97]",
        occ.done && "opacity-55",
      )}
      style={{
        top: (top * HOUR) / 60 + 1,
        height: Math.max(18, height - 2),
        left: `calc(${(column / columns) * 100}% + 2px)`,
        width: `calc(${100 / columns}% - 4px)`,
        background: tintBg(occ.color, 18),
        borderColor: occ.color,
        color: tintText(occ.color),
        translate: isDragging && drag ? `${drag.dx}px ${(drag.minutes * HOUR) / 60}px` : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <span className={cn("flex min-w-0 items-center gap-1 text-[11.5px] leading-tight font-semibold", occ.done && "line-through")}>
        {occ.kind === "task" && <TaskMark occ={occ} />}
        <span className="truncate">{occ.title}</span>
        {occ.repeat && occ.repeat !== "NONE" && <Repeat className="size-2.5 shrink-0 opacity-70" />}
      </span>
      {!short && (
        <span className="truncate text-[10.5px] opacity-80 tabular-nums">
          {time(moved ?? occ.start)}
          {occ.kind === "event" && ` – ${time(new Date((moved ?? occ.start).getTime() + (occ.end.getTime() - occ.start.getTime())))}`}
        </span>
      )}
      {!short && occ.location && height > 60 && <span className="truncate text-[10.5px] opacity-70">{occ.location}</span>}
    </motion.button>
  );
}
