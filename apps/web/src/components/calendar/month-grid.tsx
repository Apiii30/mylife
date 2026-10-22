"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import { useMounted } from "@/hooks/use-media-query";
import { dayDiff, layoutWeek, monthGrid, weekKeys, type LanePlacement, type Occurrence } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { ChipBody } from "./occurrence-chip";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Ukuran baris (px): kepala tanggal, tinggi jalur, jarak antarjalur. */
const SIZES = {
  full: { header: 30, lane: 20, gap: 2, lanes: 3, more: 18 },
  compact: { header: 30, lane: 4, gap: 3, lanes: 3, more: 6 },
};

type MonthGridProps = {
  month: string;
  today: string;
  selected: string;
  direction: number;
  occurrences: Occurrence[];
  compact: boolean;
  onSelect: (key: string) => void;
  onCreate: (key: string) => void;
  onOpen: (occ: Occurrence) => void;
  onMove: (occ: Occurrence, days: number) => void;
  onSwipe: (delta: number) => void;
};

export function MonthGrid(props: MonthGridProps) {
  const { month, today, direction, compact, onMove, onSwipe } = props;
  const { day } = useCalendarFormat();
  const mounted = useMounted();
  const weeks = useMemo(() => monthGrid(month), [month]);
  const [active, setActive] = useState<Occurrence | null>(null);
  const origin = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart({ active, activatorEvent }: DragStartEvent) {
    setActive((active.data.current as { occ: Occurrence }).occ);
    // Hari tempat kursor mulai menyeret — acara multi-hari bisa dipegang dari tengah
    const { clientX, clientY } = activatorEvent as PointerEvent;
    const cell = document.elementsFromPoint(clientX, clientY).find((el) => el instanceof HTMLElement && el.dataset.day);
    origin.current = (cell as HTMLElement | undefined)?.dataset.day ?? null;
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActive(null);
    const occ = (active.data.current as { occ: Occurrence }).occ;
    const target = over?.id ? String(over.id) : null;
    const from = origin.current ?? occ.startKey;
    if (target && target !== from) onMove(occ, dayDiff(from, target));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      // Zona auto-scroll tipis agar menyeret ke baris bawah tidak langsung menggulung halaman
      autoScroll={{ threshold: { x: 0, y: 0.06 }, acceleration: 6 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="overflow-hidden rounded-[24px] glass-card">
        <div className="grid grid-cols-7 px-1 pt-3 pb-2">
          {weekKeys(today).map((key) => (
            <span key={key} className="text-center text-[11px] font-semibold tracking-wide text-muted uppercase sm:text-[12px]">
              {day(key, { weekday: "short" })}
            </span>
          ))}
        </div>

        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={month}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: `${d * 8}%`, opacity: 0, filter: "blur(6px)" }),
              center: { x: 0, opacity: 1, filter: "blur(0px)" },
              exit: (d: number) => ({ x: `${d * -8}%`, opacity: 0, filter: "blur(6px)" }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: EASE }}
            drag={compact ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 500) onSwipe(info.offset.x < 0 ? 1 : -1);
            }}
            className="touch-pan-y"
          >
            {weeks.map((week) => (
              <WeekRow key={week[0]} week={week} {...props} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {mounted &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {active && (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.05, rotate: -1.5 }}
                transition={{ type: "spring", stiffness: 420, damping: 24 }}
                className="h-5 cursor-grabbing rounded-[6px] bg-surface shadow-[0_16px_32px_-10px_rgb(0_0_0/0.4)] ring-1 ring-line"
              >
                <ChipBody occ={active} />
              </motion.div>
            )}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

function WeekRow({ week, month, today, selected, occurrences, compact, onSelect, onCreate, onOpen }: MonthGridProps & { week: string[] }) {
  const t = useTranslations("calendar");
  const size = compact ? SIZES.compact : SIZES.full;
  const { placed, hidden } = useMemo(() => layoutWeek(week, occurrences, size.lanes), [week, occurrences, size.lanes]);
  const height = size.header + size.lanes * (size.lane + size.gap) + size.more + 6;

  return (
    <div className="@container relative grid grid-cols-7 border-t border-line" style={{ minHeight: height }}>
      {week.map((key, i) => (
        <DayCell
          key={key}
          dayKey={key}
          inMonth={key.startsWith(month)}
          isToday={key === today}
          isSelected={key === selected}
          compact={compact}
          last={i === 6}
          onSelect={() => onSelect(key)}
          onCreate={() => onCreate(key)}
        />
      ))}

      <div
        className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-7 px-px"
        style={{ gridTemplateRows: `${size.header}px repeat(${size.lanes}, ${size.lane}px) ${size.more}px`, rowGap: size.gap }}
      >
        {placed.map((p) => (
          <Chip key={p.occ.key} placement={p} compact={compact} onOpen={() => onOpen(p.occ)} />
        ))}
        {!compact &&
          hidden.map((count, col) =>
            count ? (
              <button
                key={col}
                type="button"
                onClick={() => onSelect(week[col])}
                className="pointer-events-auto truncate px-2 text-left text-[11px] font-semibold text-muted hover:text-ink"
                style={{ gridColumn: col + 1, gridRow: size.lanes + 2 }}
              >
                {t("more", { count })}
              </button>
            ) : null,
          )}
      </div>
    </div>
  );
}

function DayCell({
  dayKey,
  inMonth,
  isToday,
  isSelected,
  compact,
  last,
  onSelect,
  onCreate,
}: {
  dayKey: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  compact: boolean;
  last: boolean;
  onSelect: () => void;
  onCreate: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  const date = Number(dayKey.slice(8));

  return (
    <div
      ref={setNodeRef}
      data-day={dayKey}
      role="button"
      tabIndex={-1}
      onClick={onSelect}
      onDoubleClick={onCreate}
      aria-label={dayKey}
      aria-pressed={isSelected}
      className={cn(
        "relative cursor-default transition-colors duration-200 select-none",
        !last && "border-r border-line",
        !inMonth && "bg-ink/2",
        isOver ? "bg-accent/10" : "hover:bg-ink/2",
      )}
    >
      <div className={cn("flex h-[30px] items-center px-1.5", compact && "justify-center")}>
        <span
          className={cn(
            "relative grid size-[26px] place-items-center text-[13px] font-semibold tabular-nums transition-colors duration-300",
            !inMonth && "text-subtle",
            inMonth && "text-ink",
            isToday && !isSelected && "text-calendar",
            isSelected && "text-white",
            isSelected && !isToday && "text-canvas",
          )}
        >
          {isSelected && (
            <motion.span
              layoutId="calendar-selected"
              className={cn("absolute inset-0 rounded-full", isToday ? "bg-calendar" : "bg-ink")}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
          )}
          <span className="relative">{date}</span>
        </span>
      </div>
    </div>
  );
}

function Chip({ placement, compact, onOpen }: { placement: LanePlacement; compact: boolean; onOpen: () => void }) {
  const { occ, col, span, lane, clippedStart, clippedEnd } = placement;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: occ.key, data: { occ }, disabled: compact });
  const style = { gridColumn: `${col + 1} / span ${span}`, gridRow: lane + 2 };

  if (compact)
    return (
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className={cn("mx-[3px] origin-left rounded-full", clippedStart && "ml-0 rounded-l-none", clippedEnd && "mr-0 rounded-r-none")}
        style={{ ...style, background: occ.color, opacity: occ.done ? 0.35 : 1 }}
      />
    );

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        "pointer-events-auto min-w-0 cursor-pointer rounded-[6px] text-left transition-[background-color] hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none",
        clippedStart ? "ml-0" : "ml-1",
        clippedEnd ? "mr-0" : "mr-1",
      )}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ChipBody occ={occ} clippedStart={clippedStart} clippedEnd={clippedEnd} />
    </motion.button>
  );
}
