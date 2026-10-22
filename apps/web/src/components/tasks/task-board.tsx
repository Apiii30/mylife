"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { useReorderTasks, type Task, type TaskStatus } from "@/lib/queries/tasks";
import { TaskRow } from "./task-row";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: "var(--subtle)",
  IN_PROGRESS: "var(--c-tasks)",
  DONE: "var(--c-finance)",
};

type Columns = Record<TaskStatus, string[]>;

type TaskBoardProps = {
  tasks: Task[];
  isOverdue: (task: Task) => boolean;
  dueLabel: (task: Task) => string | null;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
};

/** Papan Kanban: geser kartu antar kolom untuk mengubah status & urutan. */
export function TaskBoard({ tasks, isOverdue, dueLabel, onToggle, onOpen, onAdd }: TaskBoardProps) {
  const t = useTranslations("tasks");
  const reorder = useReorderTasks();
  const mounted = useMounted();
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const derived = useMemo(() => {
    const columns: Columns = { TODO: [], IN_PROGRESS: [], DONE: [] };
    [...tasks].sort((a, b) => a.position - b.position).forEach((task) => columns[task.status].push(task.id));
    return columns;
  }, [tasks]);

  // Selama drag, urutan disimpan di state lokal; setelah dilepas kembali ke data server
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const columns = dragColumns ?? derived;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const containerOf = (id: string, cols: Columns): TaskStatus | undefined =>
    STATUSES.includes(id as TaskStatus) ? (id as TaskStatus) : STATUSES.find((s) => cols[s].includes(id));

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragColumns(derived);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragColumns) return;
    const from = containerOf(String(active.id), dragColumns);
    const to = containerOf(String(over.id), dragColumns);
    if (!from || !to || from === to) return;

    setDragColumns((cols) => {
      if (!cols) return cols;
      const overIndex = cols[to].indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : cols[to].length;
      return {
        ...cols,
        [from]: cols[from].filter((id) => id !== active.id),
        [to]: [...cols[to].slice(0, insertAt), String(active.id), ...cols[to].slice(insertAt)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const cols = dragColumns;
    setActiveId(null);
    setDragColumns(null);
    if (!over || !cols) return;

    const column = containerOf(String(active.id), cols);
    if (!column) return;
    const oldIndex = cols[column].indexOf(String(active.id));
    const newIndex = cols[column].indexOf(String(over.id));
    const final: Columns = {
      ...cols,
      [column]: newIndex >= 0 && newIndex !== oldIndex ? arrayMove(cols[column], oldIndex, newIndex) : cols[column],
    };

    // Kirim hanya kolom yang berubah
    const items = STATUSES.filter((s) => final[s].join() !== derived[s].join()).flatMap((status) =>
      final[status].map((id, position) => ({ id, status, position })),
    );
    if (items.length) reorder.mutate(items);
  }

  const activeTask = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDragColumns(null);
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {STATUSES.map((status, i) => (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
            className="w-[85%] shrink-0 snap-center md:w-auto"
          >
            <Column status={status} count={columns[status].length} color={STATUS_COLOR[status]} onAdd={() => onAdd(status)}>
              <SortableContext items={columns[status]} strategy={verticalListSortingStrategy}>
                {columns[status].map((id) => {
                  const task = byId.get(id);
                  if (!task) return null;
                  const shown = status === task.status ? task : { ...task, status };
                  return (
                    <SortableCard key={id} id={id}>
                      <TaskRow
                        task={shown}
                        overdue={isOverdue(shown)}
                        dueLabel={dueLabel(shown)}
                        onToggle={() => onToggle(task)}
                        onOpen={() => onOpen(task)}
                      />
                    </SortableCard>
                  );
                })}
              </SortableContext>
              {columns[status].length === 0 && (
                <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-muted">
                  {t("empty.column")}
                </p>
              )}
            </Column>
          </motion.div>
        ))}
      </div>

      {/* Portal: pembungkus animasi halaman memakai transform/filter yang mengacaukan posisi `fixed` */}
      {mounted &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            {activeTask && (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: 1.04, rotate: -1.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="cursor-grabbing rounded-[18px] bg-surface shadow-[0_24px_48px_-12px_rgb(0_0_0/0.35)] ring-1 ring-line"
              >
                <TaskRow task={activeTask} overdue={isOverdue(activeTask)} dueLabel={dueLabel(activeTask)} onToggle={() => {}} onOpen={() => {}} />
              </motion.div>
            )}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

function Column({
  status,
  count,
  color,
  onAdd,
  children,
}: {
  status: TaskStatus;
  count: number;
  color: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("tasks");
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-80 flex-col rounded-[26px] bg-ink/3 p-2 ring-1 ring-transparent transition-[background-color,box-shadow] duration-300",
        isOver && "bg-ink/5 ring-line-strong",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-2 pb-3">
        <span className="size-2.5 rounded-full" style={{ background: color }} />
        <h3 className="text-[14px] font-semibold text-ink">{t(`status.${status}`)}</h3>
        <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[12px] font-medium text-muted tabular-nums">{count}</span>
        <button
          type="button"
          onClick={onAdd}
          aria-label={t("add")}
          className="ml-auto grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Plus className="size-4" />
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </section>
  );
}

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "glass-card cursor-grab touch-manipulation rounded-[18px] transition-opacity active:cursor-grabbing",
        isDragging && "opacity-35",
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
