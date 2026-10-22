"use client";

import { MapPin } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useMemo } from "react";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import { useCalendarItems } from "@/hooks/use-calendar-items";
import { compareOccurrences, type Occurrence } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/month";
import { localDateKey } from "@/lib/task-dates";
import { EmptyState, Widget } from "./widget";

const LAYERS = { events: true, tasks: false, goals: false };
const LIMIT = 4;
const SOON_MS = 3 * 3_600_000;

/** Acara 2 minggu ke depan, dikelompokkan per hari dengan "ubin tanggal" ala Apple. */
export function EventsWidget({ index }: { index: number }) {
  const t = useTranslations("calendar");
  const tOverview = useTranslations("dashboard.overview");
  const format = useFormatter();
  const { day, span } = useCalendarFormat();
  const now = useNow({ updateInterval: 60_000 });
  const today = localDateKey(now);
  const { occurrences, isLoading } = useCalendarItems(today, addDays(today, 14), LAYERS);

  const groups = useMemo(() => {
    const upcoming = occurrences
      .filter((o) => (o.allDay ? o.endKey >= today : o.end > now))
      .sort((a, b) => a.start.getTime() - b.start.getTime() || compareOccurrences(a, b))
      .slice(0, LIMIT);
    const map = new Map<string, Occurrence[]>();
    for (const occ of upcoming) {
      const key = occ.startKey < today ? today : occ.startKey;
      map.set(key, [...(map.get(key) ?? []), occ]);
    }
    return [...map.entries()];
  }, [occurrences, today, now]);

  return (
    <Widget module="calendar" title={tOverview("upcoming")} index={index}>
      {!isLoading && groups.length === 0 ? (
        <EmptyState module="calendar" text={tOverview("empty.events")} cta={tOverview("empty.eventsCta")} />
      ) : (
        <ol className="-mx-1 flex flex-col gap-3">
          {groups.map(([key, items], g) => (
            <motion.li
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 + g * 0.06 }}
              className="flex gap-3"
            >
              <Link
                href={`/dashboard/calendar?date=${key}`}
                className="flex w-11 shrink-0 flex-col items-center rounded-xl py-1 transition-colors hover:bg-ink/4"
              >
                <span className={cn("text-[10px] font-semibold uppercase", key === today ? "text-calendar" : "text-muted")}>
                  {day(key, { weekday: "short" })}
                </span>
                <span className={cn("text-[20px] leading-tight font-semibold tabular-nums", key === today ? "text-calendar" : "text-ink")}>
                  {Number(key.slice(8))}
                </span>
              </Link>
              <ul className="flex min-w-0 flex-1 flex-col gap-1.5 border-t border-line pt-1.5">
                {items.map((occ) => {
                  const live = !occ.allDay && occ.start <= now && occ.end > now;
                  const soon = !occ.allDay && !live && occ.start.getTime() - now.getTime() < SOON_MS;
                  return (
                    <li key={occ.key}>
                      <Link href={`/dashboard/calendar?date=${key}`} className="flex gap-2.5 rounded-lg py-0.5 transition-opacity hover:opacity-75">
                        <span className="w-[3px] shrink-0 rounded-full" style={{ background: occ.color }} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-ink">{occ.title}</span>
                          <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted tabular-nums">
                            {span(occ, key)}
                            {live && (
                              <span className="flex items-center gap-1 font-medium text-calendar">
                                <span className="relative flex size-1.5">
                                  <span className="absolute inset-0 animate-ping rounded-full bg-calendar opacity-70" />
                                  <span className="relative size-1.5 rounded-full bg-calendar" />
                                </span>
                                {t("live")}
                              </span>
                            )}
                            {soon && <span className="font-medium text-ink-2">{format.relativeTime(occ.start, now)}</span>}
                            {occ.location && (
                              <span className="flex min-w-0 items-center gap-1">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">{occ.location}</span>
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.li>
          ))}
        </ol>
      )}
    </Widget>
  );
}
