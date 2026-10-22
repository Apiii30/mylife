"use client";

import { Flame, PenLine } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { MoodBadge } from "@/components/journal/mood-picker";
import { cn } from "@/lib/cn";
import { dayDate } from "@/lib/month";
import { useJournalStats, useLatestJournal } from "@/lib/queries/journals";
import { localDateKey } from "@/lib/task-dates";
import { EmptyState, Widget } from "./widget";

/** Entri terakhir + streak menulis; ajakan menulis bila hari ini belum ada entri. */
export function JournalWidget({ index }: { index: number }) {
  const t = useTranslations("journal");
  const tOverview = useTranslations("dashboard.overview");
  const format = useFormatter();
  const today = localDateKey(useNow({ updateInterval: 60_000 }));
  const { data: latest, isLoading } = useLatestJournal();
  const { data: stats } = useJournalStats(today.slice(0, 7), today);

  return (
    <Widget module="journal" title={tOverview("journal")} index={index}>
      {!isLoading && !latest ? (
        <EmptyState module="journal" text={tOverview("empty.journal")} cta={tOverview("empty.journalCta")} />
      ) : latest ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold", stats?.streak ? "text-journal" : "text-muted")}>
              <Flame className="size-4" fill={stats?.streak ? "currentColor" : "none"} />
              {t("streakShort", { count: stats?.streak ?? 0 })}
            </span>
            <MoodBadge mood={latest.mood} showLabel={false} />
          </div>
          <Link href={`/dashboard/journal/${latest.id}`} className="group block flex-1 rounded-2xl transition-opacity hover:opacity-80">
            <p className="text-[12px] font-medium text-muted">
              {format.dateTime(dayDate(latest.date), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            </p>
            <h3 className="mt-0.5 truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">{latest.title || t("untitled")}</h3>
            {latest.excerpt && <p className="mt-1 line-clamp-3 font-serif text-[14px] leading-relaxed text-ink-2 italic">“{latest.excerpt}”</p>}
          </Link>
          {stats && !stats.writtenToday && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Link
                href={`/dashboard/journal/new?date=${today}`}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-journal/12 px-3.5 text-[13px] font-semibold text-journal transition-[filter,transform] hover:brightness-110 active:scale-95"
              >
                <PenLine className="size-3.5" />
                {t("writeToday")}
              </Link>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="h-28 animate-pulse rounded-2xl bg-ink/4" />
      )}
    </Widget>
  );
}
