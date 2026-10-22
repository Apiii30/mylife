"use client";

import { useFormatter, useLocale, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { useCallback } from "react";
import { keyToDate, type Occurrence } from "@/lib/calendar";

const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Format jam & tanggal kalender di zona waktu perangkat. */
export function useCalendarFormat() {
  const t = useTranslations("calendar");
  const format = useFormatter();
  // "09.00" lazim di Indonesia, "9:00 AM" di bahasa Inggris
  const hour = useLocale() === "id" ? "2-digit" : "numeric";

  const time = useCallback((date: Date) => format.dateTime(date, { hour, minute: "2-digit", timeZone: deviceTz() }), [format, hour]);

  const day = useCallback(
    (key: string, options: DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
      format.dateTime(keyToDate(key), { ...options, timeZone: deviceTz() }),
    [format],
  );

  /** "09.00 – 10.30", "Seharian", "22 Okt – 24 Okt", "Tenggat tugas · 14.00". */
  const span = useCallback(
    (occ: Occurrence, onDay?: string) => {
      const multiDay = occ.startKey !== occ.endKey;
      if (occ.kind === "goal") return t("goalDeadline");
      if (occ.kind === "task") return occ.allDay ? t("taskDue") : `${t("taskDue")} · ${time(occ.start)}`;
      if (occ.allDay) return multiDay ? `${day(occ.startKey)} – ${day(occ.endKey)}` : t("allDay");
      if (!multiDay) return `${time(occ.start)} – ${time(occ.end)}`;
      // Acara berjam lintas hari: tampilkan relatif terhadap hari yang dilihat
      if (onDay && onDay !== occ.startKey && onDay !== occ.endKey) return t("allDay");
      if (onDay === occ.endKey) return t("until", { time: time(occ.end) });
      if (onDay === occ.startKey) return t("from", { time: time(occ.start) });
      return `${day(occ.startKey)} ${time(occ.start)} – ${day(occ.endKey)} ${time(occ.end)}`;
    },
    [t, time, day],
  );

  return { time, day, span };
}
