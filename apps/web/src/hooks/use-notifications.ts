"use client";

import { AlarmClock, CalendarClock, Flag, NotebookPen, PartyPopper, type LucideIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { categoryColor } from "@/config/categories";
import { expandEvents } from "@/lib/calendar";
import { addDays } from "@/lib/month";
import { useEvents } from "@/lib/queries/events";
import { useGoals } from "@/lib/queries/goals";
import { useJournalStats } from "@/lib/queries/journals";
import { useTasks } from "@/lib/queries/tasks";
import { useMe, useUpdateMe } from "@/lib/queries/user";
import { addDaysKey, localDateKey } from "@/lib/task-dates";

export type AppNotification = {
  key: string;
  icon: LucideIcon;
  color: string;
  title: string;
  body: string;
  href: string;
  time: Date; // kapan notifikasi "muncul" — menentukan status belum dibaca
  showTime?: boolean; // false untuk acara: waktunya sudah tertulis di isi notifikasi
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const JOURNAL_REMINDER_HOUR = 19;
const MAX_ITEMS = 30;

/**
 * Notifikasi yang diturunkan dari data aplikasi (bukan disimpan): tugas terlambat/jatuh tempo,
 * acara 24 jam ke depan, tenggat & pencapaian goal, dan pengingat jurnal.
 * Status dibaca = waktu terakhir panel dibuka (disimpan di server, sinkron antar perangkat).
 */
export function useNotifications() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const today = localDateKey(now);

  const { data: me } = useMe();
  const { data: tasks } = useTasks();
  const { data: goals } = useGoals();
  const { data: events } = useEvents(today, addDays(today, 2));
  const { data: journal } = useJournalStats(today.slice(0, 7), today);
  const update = useUpdateMe();

  const items = useMemo(() => {
    const out: AppNotification[] = [];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit" });

    // Tugas
    const open = (tasks ?? []).filter((task) => task.status !== "DONE" && task.dueDate);
    const overdue = open.filter((task) => {
      const due = new Date(task.dueDate!);
      return task.hasDueTime ? due < now : localDateKey(due) < today;
    });
    const dueToday = open.filter((task) => !overdue.includes(task) && localDateKey(new Date(task.dueDate!)) === today);

    if (overdue.length === 1) {
      const task = overdue[0];
      out.push({ key: `overdue:${task.id}`, icon: AlarmClock, color: "var(--c-calendar)", title: t("overdueOne"), body: task.title, href: "/dashboard/tasks", time: new Date(task.dueDate!) });
    } else if (overdue.length > 1) {
      const latest = Math.max(...overdue.map((task) => new Date(task.dueDate!).getTime()));
      out.push({ key: "overdue", icon: AlarmClock, color: "var(--c-calendar)", title: t("overdueMany", { count: overdue.length }), body: overdue.slice(0, 3).map((task) => task.title).join(" · "), href: "/dashboard/tasks", time: new Date(latest) });
    }
    if (dueToday.length) {
      out.push({ key: `today:${today}`, icon: Flag, color: "var(--c-tasks)", title: t("dueToday", { count: dueToday.length }), body: dueToday.slice(0, 3).map((task) => task.title).join(" · "), href: "/dashboard/tasks", time: startOfToday });
    }

    // Acara dalam 24 jam
    for (const occ of expandEvents(events ?? [], today, addDays(today, 2), categoryColor)) {
      if (occ.allDay) {
        if (occ.startKey === today || occ.startKey === addDaysKey(today, 1)) {
          out.push({ key: `event:${occ.key}`, icon: CalendarClock, color: occ.color, title: occ.title, body: occ.startKey === today ? t("allDayToday") : t("allDayTomorrow"), href: `/dashboard/calendar?date=${occ.startKey}`, time: new Date(occ.start.getTime() - DAY), showTime: false });
        }
        continue;
      }
      const until = occ.start.getTime() - now.getTime();
      const live = occ.start <= now && occ.end > now;
      if (!live && (until < 0 || until > DAY)) continue;
      out.push({
        key: `event:${occ.key}`,
        icon: CalendarClock,
        color: occ.color,
        title: occ.title,
        body: live ? t("eventLive", { time: time(occ.end) }) : t("eventSoon", { relative: format.relativeTime(occ.start, now), time: time(occ.start) }),
        href: `/dashboard/calendar?date=${occ.startKey}`,
        time: new Date(occ.start.getTime() - DAY),
        showTime: false,
      });
    }

    // Goals
    for (const goal of goals ?? []) {
      if (goal.status === "COMPLETED" && goal.completedAt && now.getTime() - new Date(goal.completedAt).getTime() < 7 * DAY) {
        out.push({ key: `goal-done:${goal.id}`, icon: PartyPopper, color: "var(--c-finance)", title: t("goalDone"), body: goal.title, href: `/dashboard/goals?goal=${goal.id}`, time: new Date(goal.completedAt) });
      }
      if (goal.status === "ACTIVE" && goal.deadline) {
        const [y, m, d] = goal.deadline.split("-").map(Number);
        const deadline = new Date(y, m - 1, d);
        const days = Math.round((deadline.getTime() - startOfToday.getTime()) / DAY);
        if (days >= 0 && days <= 7) {
          out.push({ key: `goal-due:${goal.id}`, icon: Flag, color: "var(--c-goals)", title: days === 0 ? t("goalDueToday") : t("goalDueSoon", { days }), body: `${goal.title} · ${Math.round(goal.progress * 100)}%`, href: `/dashboard/goals?goal=${goal.id}`, time: new Date(deadline.getTime() - 7 * DAY) });
        }
      }
    }

    // Pengingat jurnal malam hari
    const reminder = new Date(startOfToday.getTime() + JOURNAL_REMINDER_HOUR * HOUR);
    if (journal && !journal.writtenToday && now >= reminder) {
      out.push({
        key: `journal:${today}`,
        icon: NotebookPen,
        color: "var(--c-journal)",
        title: t("journalTitle"),
        body: journal.streak ? t("journalStreak", { count: journal.streak }) : t("journalBody"),
        href: `/dashboard/journal/new?date=${today}`,
        time: reminder,
      });
    }

    return out.filter((n) => n.time <= now).sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, MAX_ITEMS);
  }, [tasks, goals, events, journal, now, today, t, format]);

  const seenIso = me?.notificationsSeenAt;
  const seenAt = useMemo(() => (seenIso ? new Date(seenIso) : null), [seenIso]);
  const isUnread = useCallback((n: AppNotification) => !seenAt || n.time > seenAt, [seenAt]);
  const unread = items.filter(isUnread).length;

  const { mutate } = update;
  const markSeen = useCallback(() => mutate({ notificationsSeenAt: new Date().toISOString() }), [mutate]);

  return { items, unread, isUnread, markSeen };
}
