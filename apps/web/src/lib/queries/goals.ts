"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { categoryColor } from "@/config/categories";
import { celebrate } from "@/lib/celebrate";

export type GoalType = "FINANCIAL" | "LIFE";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type Milestone = { id: string; title: string; done: boolean; doneAt: string | null; position: number };

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  type: GoalType;
  targetAmount: number | null;
  color: string;
  icon: string;
  deadline: string | null; // YYYY-MM-DD
  status: GoalStatus;
  completedAt: string | null;
  createdAt: string;
  milestones: Milestone[];
  saved: number;
  progress: number; // 0–1
};

export type Deposit = { id: string; amount: number; date: string; note: string | null; transactionId: string | null };

export type GoalInput = {
  title: string;
  description?: string | null;
  type: GoalType;
  targetAmount?: number | null;
  deadline?: string | null;
  color: string;
  icon: string;
  milestones?: string[];
};

const LIST = ["goals"] as const;
const detailKey = (id: string) => ["goal", id] as const;

export function useGoals() {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: LIST,
    queryFn: () => call<{ goals: Goal[] }>("/goals").then((r) => r.goals),
    enabled: ready,
  });
}

export function useGoalDeposits(id: string | null) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => call<{ goal: Goal; deposits: Deposit[] }>(`/goals/${id}`).then((r) => r.deposits),
    enabled: ready && Boolean(id),
  });
}

/** Simpan goal hasil server ke cache daftar + rayakan jika baru saja tercapai. */
function useApplyGoal() {
  const client = useQueryClient();
  return (goal: Goal) => {
    const previous = client.getQueryData<Goal[]>(LIST)?.find((g) => g.id === goal.id);
    client.setQueryData<Goal[]>(LIST, (old = []) =>
      old.some((g) => g.id === goal.id) ? old.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...old],
    );
    if (previous && previous.status !== "COMPLETED" && goal.status === "COMPLETED") {
      celebrate([categoryColor(goal.color), "var(--c-journal)", "var(--c-gallery)", "var(--c-tasks)", "var(--c-yellow)"]);
    }
  };
}

function useGoalMutation<V>(fn: (vars: V) => Promise<{ goal: Goal }>, options: { finance?: boolean } = {}) {
  const client = useQueryClient();
  const apply = useApplyGoal();
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ goal }) => {
      apply(goal);
      client.invalidateQueries({ queryKey: detailKey(goal.id) });
      if (options.finance) {
        client.invalidateQueries({ queryKey: ["transactions"] });
        client.invalidateQueries({ queryKey: ["finance-summary"] });
        client.invalidateQueries({ queryKey: ["categories"] });
      }
    },
  });
}

export function useCreateGoal() {
  const { call } = useApi();
  return useGoalMutation((body: GoalInput) => call<{ goal: Goal }>("/goals", { method: "POST", body }));
}

export function useUpdateGoal() {
  const { call } = useApi();
  return useGoalMutation(({ id, ...body }: Partial<Omit<GoalInput, "type" | "milestones">> & { id: string; status?: "ACTIVE" | "ARCHIVED" }) =>
    call<{ goal: Goal }>(`/goals/${id}`, { method: "PATCH", body }),
  );
}

export function useDeleteGoal() {
  const { call } = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => call<void>(`/goals/${id}`, { method: "DELETE" }),
    onMutate: (id) => client.setQueryData<Goal[]>(LIST, (old = []) => old.filter((g) => g.id !== id)),
    onSettled: () => client.invalidateQueries({ queryKey: LIST }),
  });
}

export function useAddMilestone() {
  const { call } = useApi();
  return useGoalMutation(({ goalId, title }: { goalId: string; title: string }) =>
    call<{ goal: Goal }>(`/goals/${goalId}/milestones`, { method: "POST", body: { title } }),
  );
}

export function useToggleMilestone() {
  const { call } = useApi();
  const client = useQueryClient();
  const apply = useApplyGoal();
  return useMutation({
    mutationFn: ({ goalId, milestoneId, done }: { goalId: string; milestoneId: string; done: boolean }) =>
      call<{ goal: Goal }>(`/goals/${goalId}/milestones/${milestoneId}`, { method: "PATCH", body: { done } }),
    // Centang langsung terlihat; progres ikut dihitung ulang
    onMutate: async ({ goalId, milestoneId, done }) => {
      await client.cancelQueries({ queryKey: LIST });
      const previous = client.getQueryData<Goal[]>(LIST);
      client.setQueryData<Goal[]>(LIST, (old = []) =>
        old.map((g) => {
          if (g.id !== goalId) return g;
          const milestones = g.milestones.map((m) => (m.id === milestoneId ? { ...m, done } : m));
          return { ...g, milestones, progress: milestones.filter((m) => m.done).length / milestones.length };
        }),
      );
      return { previous };
    },
    onError: (_e, _v, context) => context?.previous && client.setQueryData(LIST, context.previous),
    onSuccess: ({ goal }, _vars, context) => {
      // Bandingkan dengan status sebelum klik agar confetti tetap muncul
      if (context?.previous) client.setQueryData(LIST, context.previous);
      apply(goal);
    },
  });
}

export function useDeleteMilestone() {
  const { call } = useApi();
  return useGoalMutation(({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
    call<{ goal: Goal }>(`/goals/${goalId}/milestones/${milestoneId}`, { method: "DELETE" }),
  );
}

export function useAddDeposit() {
  const { call } = useApi();
  return useGoalMutation(
    ({ goalId, ...body }: { goalId: string; amount: number; date: string; note: string | null; recordTransaction: boolean }) =>
      call<{ goal: Goal }>(`/goals/${goalId}/deposits`, { method: "POST", body }),
    { finance: true },
  );
}

export function useDeleteDeposit() {
  const { call } = useApi();
  return useGoalMutation(
    ({ goalId, depositId }: { goalId: string; depositId: string }) =>
      call<{ goal: Goal }>(`/goals/${goalId}/deposits/${depositId}`, { method: "DELETE" }),
    { finance: true },
  );
}
