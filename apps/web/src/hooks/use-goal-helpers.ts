"use client";

import { useNow } from "next-intl";
import { useCallback } from "react";
import { useMoney } from "@/lib/queries/finance";
import type { Goal } from "@/lib/queries/goals";
import { localDateKey } from "@/lib/task-dates";

const DAY = 86_400_000;
const keyToUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);

/** Sisa hari ke tenggat & saran tabungan per bulan agar tepat waktu. */
export function useGoalHelpers() {
  const today = localDateKey(useNow({ updateInterval: 60 * 60_000 }));
  const { money } = useMoney();

  const daysLeft = useCallback(
    (goal: Pick<Goal, "deadline">) => (goal.deadline ? Math.round((keyToUtc(goal.deadline) - keyToUtc(today)) / DAY) : null),
    [today],
  );

  const perMonth = useCallback(
    (goal: Goal) => {
      if (goal.type !== "FINANCIAL" || !goal.targetAmount || goal.status !== "ACTIVE") return null;
      const remaining = goal.targetAmount - goal.saved;
      const days = daysLeft(goal);
      if (remaining <= 0 || days === null || days < 0) return null;
      return remaining / Math.max(1, Math.ceil(days / 30.44));
    },
    [daysLeft],
  );

  return { today, daysLeft, perMonth, money };
}
