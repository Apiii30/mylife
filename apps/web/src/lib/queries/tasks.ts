"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null; // ISO
  hasDueTime: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  position: number;
  completedAt: string | null;
  createdAt: string;
  category: { id: string; name: string; color: string; icon: string | null } | null;
};

export type TaskInput = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  hasDueTime?: boolean;
  priority?: TaskPriority;
  status?: TaskStatus;
  categoryId?: string | null;
};

const KEY = ["tasks"] as const;

export function useTasks() {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: KEY,
    queryFn: () => call<{ tasks: Task[] }>("/tasks").then((r) => r.tasks),
    enabled: ready,
  });
}

/** Terapkan perubahan ke cache dulu (optimistic), batalkan jika request gagal. */
function useOptimistic() {
  const client = useQueryClient();
  return {
    async apply(update: (tasks: Task[]) => Task[]) {
      await client.cancelQueries({ queryKey: KEY });
      const previous = client.getQueryData<Task[]>(KEY);
      if (previous) client.setQueryData<Task[]>(KEY, update(previous));
      return { previous };
    },
    rollback(context?: { previous?: Task[] }) {
      if (context?.previous) client.setQueryData(KEY, context.previous);
    },
    settle: () => client.invalidateQueries({ queryKey: KEY }),
  };
}

export function useCreateTask() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskInput) => call<{ task: Task }>("/tasks", { method: "POST", body }).then((r) => r.task),
    onSuccess: (task) => client.setQueryData<Task[]>(KEY, (old = []) => [task, ...old]),
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTask() {
  const { call } = useApi();
  const optimistic = useOptimistic();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<TaskInput> & { id: string }) =>
      call<{ task: Task }>(`/tasks/${id}`, { method: "PATCH", body }).then((r) => r.task),
    onMutate: ({ id, ...patch }) =>
      optimistic.apply((tasks) =>
        tasks.map((t) =>
          t.id !== id
            ? t
            : {
                ...t,
                ...patch,
                completedAt: patch.status ? (patch.status === "DONE" ? (t.completedAt ?? new Date().toISOString()) : null) : t.completedAt,
              },
        ),
      ),
    onError: (_e, _v, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}

export function useDeleteTask() {
  const { call } = useApi();
  const optimistic = useOptimistic();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/tasks/${id}`, { method: "DELETE" }),
    onMutate: (id) => optimistic.apply((tasks) => tasks.filter((t) => t.id !== id)),
    onError: (_e, _v, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}

export type OrderItem = { id: string; status: TaskStatus; position: number };

export function useReorderTasks() {
  const { call } = useApi();
  const optimistic = useOptimistic();
  return useMutation({
    mutationFn: (items: OrderItem[]) => call<void>("/tasks/order", { method: "PUT", body: { items } }),
    onMutate: (items) =>
      optimistic.apply((tasks) =>
        tasks.map((t) => {
          const item = items.find((i) => i.id === t.id);
          if (!item) return t;
          const completedAt = item.status === "DONE" ? (t.completedAt ?? new Date().toISOString()) : null;
          return { ...t, status: item.status, position: item.position, completedAt };
        }),
      ),
    onError: (_e, _v, context) => optimistic.rollback(context),
    onSettled: optimistic.settle,
  });
}
