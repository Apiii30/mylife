"use client";

import { useMemo } from "react";
import { categoryColor } from "@/config/categories";
import { expandEvents, type Occurrence } from "@/lib/calendar";
import { addDays } from "@/lib/month";
import { useEvents } from "@/lib/queries/events";
import { useGoals } from "@/lib/queries/goals";
import { useTasks } from "@/lib/queries/tasks";
import { localDateKey } from "@/lib/task-dates";

export type Layers = { events: boolean; tasks: boolean; goals: boolean };
export const ALL_LAYERS: Layers = { events: true, tasks: true, goals: true };

const TASK_MINUTES = 30;

/** Acara + tugas bertenggat + tenggat goal dalam rentang [from, to), siap ditempatkan di kalender. */
export function useCalendarItems(from: string, to: string, layers: Layers = ALL_LAYERS) {
  const { data: events, isLoading } = useEvents(from, to);
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();

  const occurrences = useMemo(() => {
    const out: Occurrence[] = [];
    if (layers.events && events) out.push(...expandEvents(events, from, to, categoryColor));

    if (layers.tasks)
      for (const task of tasks ?? []) {
        if (!task.dueDate) continue;
        const start = new Date(task.dueDate);
        const key = localDateKey(start);
        if (key < from || key >= to) continue;
        out.push({
          key: `task:${task.id}`,
          kind: "task",
          id: task.id,
          title: task.title,
          color: task.category ? categoryColor(task.category.color) : "var(--c-tasks)",
          allDay: !task.hasDueTime,
          start,
          end: task.hasDueTime ? new Date(start.getTime() + TASK_MINUTES * 60_000) : new Date(start.getTime() + 86_400_000),
          startKey: key,
          endKey: key,
          done: task.status === "DONE",
        });
      }

    if (layers.goals)
      for (const goal of goals ?? []) {
        if (!goal.deadline || goal.status === "ARCHIVED" || goal.deadline < from || goal.deadline >= to) continue;
        const [y, m, d] = goal.deadline.split("-").map(Number);
        out.push({
          key: `goal:${goal.id}`,
          kind: "goal",
          id: goal.id,
          title: goal.title,
          color: categoryColor(goal.color),
          allDay: true,
          start: new Date(y, m - 1, d),
          end: new Date(y, m - 1, d + 1),
          startKey: goal.deadline,
          endKey: goal.deadline,
          done: goal.status === "COMPLETED",
        });
      }
    return out;
  }, [events, tasks, goals, from, to, layers.events, layers.tasks, layers.goals]);

  const sources = useMemo(
    () => ({
      events: new Map((events ?? []).map((e) => [e.id, e])),
      tasks: new Map((tasks ?? []).map((t) => [t.id, t])),
      goals: new Map((goals ?? []).map((g) => [g.id, g])),
    }),
    [events, tasks, goals],
  );

  return { occurrences, sources, isLoading };
}

/** Rentang kunci tanggal [from, to) dari daftar hari yang terlihat. */
export const rangeOf = (days: string[]) => ({ from: days[0], to: addDays(days[days.length - 1], 1) });
