"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";
import { addDaysKey, localDateKey } from "@/lib/task-dates";

/** "Hari ini · 14.00", "Besok", "Sen, 27 Okt" — dalam zona waktu perangkat. */
export function useDueLabel(today: string) {
  const t = useTranslations("tasks.when");
  const format = useFormatter();

  return useCallback(
    (dueDate: string, hasTime: boolean) => {
      const date = new Date(dueDate);
      const key = localDateKey(date);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const day =
        key === today
          ? t("today")
          : key === addDaysKey(today, 1)
            ? t("tomorrow")
            : key === addDaysKey(today, -1)
              ? t("yesterday")
              : format.dateTime(date, { weekday: "short", day: "numeric", month: "short", timeZone: tz });
      return hasTime ? `${day} · ${format.dateTime(date, { hour: "2-digit", minute: "2-digit", timeZone: tz })}` : day;
    },
    [today, t, format],
  );
}
