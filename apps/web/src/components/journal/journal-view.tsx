"use client";

import { ChevronLeft, ChevronRight, Flame, NotebookPen, PenLine, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { JOURNAL_PROMPTS, MOODS, type Mood } from "@/config/moods";
import { monthGrid } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { dayDate, monthDate, shiftMonth } from "@/lib/month";
import { useJournalList, useJournalStats, type JournalSummary } from "@/lib/queries/journals";
import { localDateKey } from "@/lib/task-dates";
import { MoodBadge } from "./mood-picker";

export function JournalView() {
  const t = useTranslations("journal");
  const format = useFormatter();
  const today = localDateKey(useNow({ updateInterval: 60_000 }));
  const [month, setMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);

  // Cari di server setelah user berhenti mengetik sebentar
  useEffect(() => {
    const id = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: stats } = useJournalStats(month, today);
  const list = useJournalList(q, mood);
  const entries = useMemo(() => list.data?.pages.flatMap((p) => p.entries) ?? [], [list.data]);
  const filtering = Boolean(q || mood);

  const groups = useMemo(() => {
    const map = new Map<string, JournalSummary[]>();
    for (const entry of entries) map.set(entry.date.slice(0, 7), [...(map.get(entry.date.slice(0, 7)) ?? []), entry]);
    return [...map.entries()];
  }, [entries]);

  // Muat halaman berikutnya saat penanda di bawah daftar terlihat
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={NotebookPen} color="var(--c-journal)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">
              {t("summary", { entries: stats?.total ?? 0, words: format.number(stats?.words ?? 0) })}
            </p>
          </div>
        </div>
        <ButtonLink href={`/dashboard/journal/new?date=${today}`} className="self-start md:self-auto" style={{ background: "var(--c-journal)" }}>
          <PenLine className="size-4" />
          {stats?.writtenToday ? t("writeAgain") : t("writeToday")}
        </ButtonLink>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Sidebar: streak & suasana hati (di ponsel tampil di atas) */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <StreakCard streak={stats?.streak ?? 0} writtenToday={stats?.writtenToday ?? false} />
          <MoodMonth month={month} today={today} moods={stats?.moods ?? {}} onMonth={setMonth} />
        </aside>

        <section className="min-w-0 lg:order-1">
          <div className="mb-5 flex flex-col gap-3">
            <div className="flex h-11 items-center gap-2.5 rounded-full glass-card px-4 focus-within:ring-2 focus-within:ring-journal/50">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="×" className="grid size-6 place-items-center rounded-full text-muted hover:bg-ink/6">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {MOODS.map(({ key, icon: Icon, color, ink }) => {
                const active = mood === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMood(active ? null : key)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full pr-3.5 pl-1.5 text-[13px] font-medium ring-1 transition-colors",
                      active ? "ring-transparent" : "glass-card text-ink-2 ring-transparent hover:text-ink",
                    )}
                    style={active ? { background: color, color: ink } : undefined}
                  >
                    <span className="grid size-6 place-items-center rounded-full" style={active ? undefined : { background: color, color: ink }}>
                      <Icon className="size-3.5" strokeWidth={2.5} />
                    </span>
                    {t(`mood.${key}`)}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {list.isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-[24px] bg-ink/4" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            filtering ? (
              <p className="rounded-[24px] border border-dashed border-line-strong px-6 py-14 text-center text-[14px] text-muted">{t("empty.filtered")}</p>
            ) : (
              <EmptyJournal today={today} />
            )
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map(([key, items]) => (
                <div key={key}>
                  <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">
                    {format.dateTime(monthDate(key), { month: "long", year: "numeric", timeZone: "UTC" })}
                  </h2>
                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false} mode="popLayout">
                      {items.map((entry, i) => (
                        <EntryCard key={entry.id} entry={entry} index={i} today={today} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              ))}
              <div ref={sentinel} className="h-8">
                {isFetchingNextPage && <div className="mx-auto size-5 animate-spin rounded-full border-2 border-journal border-t-transparent" />}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function EntryCard({ entry, index, today }: { entry: JournalSummary; index: number; today: string }) {
  const t = useTranslations("journal");
  const format = useFormatter();
  const date = dayDate(entry.date);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: Math.min(index, 8) * 0.04 }}
    >
      <Link
        href={`/dashboard/journal/${entry.id}`}
        className="group flex gap-4 rounded-[20px] glass-card p-4 transition-[box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgb(0_0_0/0.28)]"
      >
        <div className="flex w-11 shrink-0 flex-col items-center pt-0.5">
          <span className={cn("text-[11px] font-semibold uppercase", entry.date === today ? "text-journal" : "text-muted")}>
            {format.dateTime(date, { weekday: "short", timeZone: "UTC" })}
          </span>
          <span className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ink tabular-nums">{date.getUTCDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate text-[17px] font-semibold tracking-[-0.015em]", entry.title ? "text-ink" : "text-muted")}>
            {entry.title || t("untitled")}
          </h3>
          {entry.excerpt && <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-ink-2">{entry.excerpt}</p>}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-muted">
            <MoodBadge mood={entry.mood} />
            <span className="tabular-nums">{t("words", { count: entry.wordCount })}</span>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

function StreakCard({ streak, writtenToday }: { streak: number; writtenToday: boolean }) {
  const t = useTranslations("journal");
  const lit = streak > 0;
  return (
    <div className="relative overflow-hidden rounded-[24px] glass-card p-4">
      <div aria-hidden className="absolute -top-16 -right-10 size-44 rounded-full opacity-25 blur-3xl" style={{ background: lit ? "var(--c-journal)" : "var(--subtle)" }} />
      <div className="relative flex items-center gap-4">
        <motion.span
          className="grid size-14 place-items-center rounded-[18px]"
          style={{
            background: lit ? "linear-gradient(180deg, #ffb340, var(--c-journal) 55%, #ff5e3a)" : "var(--line-strong)",
            boxShadow: lit ? "0 10px 24px -10px var(--c-journal)" : undefined,
          }}
          animate={lit ? { rotate: [0, -4, 3, 0], scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Flame className={cn("size-7", lit ? "text-white" : "text-muted")} fill={lit ? "currentColor" : "none"} />
        </motion.span>
        <div>
          <p className="text-[28px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {streak}
            <span className="ml-1.5 text-[15px] font-medium tracking-normal text-muted">{t("streakDays", { count: streak })}</span>
          </p>
          <p className="mt-1.5 text-[13px] text-muted">{writtenToday ? t("streakDone") : lit ? t("streakKeep") : t("streakStart")}</p>
        </div>
      </div>
    </div>
  );
}

/** "Year in pixels" versi sebulan: satu kotak per hari, warnanya suasana hati hari itu. */
function MoodMonth({ month, today, moods, onMonth }: { month: string; today: string; moods: Record<string, Mood>; onMonth: (m: string) => void }) {
  const t = useTranslations("journal");
  const format = useFormatter();
  const weeks = useMemo(() => monthGrid(month).filter((week) => week.some((key) => key.startsWith(month))), [month]);
  const counts = MOODS.map((m) => ({ ...m, count: Object.values(moods).filter((v) => v === m.key).length }));
  const weekdays = weeks[0].map((key) => format.dateTime(dayDate(key), { weekday: "short", timeZone: "UTC" }));

  return (
    <div className="rounded-[24px] glass-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">{t("moodMonth")}</h2>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onMonth(shiftMonth(month, -1))} aria-label="‹" className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
            <ChevronLeft className="size-4" />
          </button>
          <span className="w-[5.5rem] text-center text-[12px] font-medium text-ink-2">
            {format.dateTime(monthDate(month), { month: "short", year: "numeric", timeZone: "UTC" })}
          </span>
          <button
            type="button"
            onClick={() => onMonth(shiftMonth(month, 1))}
            disabled={month >= today.slice(0, 7)}
            aria-label="›"
            className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {weekdays.map((w, i) => (
          <span key={i} className="text-center text-[10px] font-semibold text-subtle">
            {w}
          </span>
        ))}
        <AnimatePresence mode="popLayout" initial={false}>
          {weeks.flat().map((key, i) => {
            const inMonth = key.startsWith(month);
            const mood = MOODS.find((m) => m.key === moods[key]);
            return (
              <motion.span
                key={`${month}-${key}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: inMonth ? 1 : 0, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO, delay: i * 0.006 }}
                title={inMonth ? `${format.dateTime(dayDate(key), { day: "numeric", month: "long", timeZone: "UTC" })}${mood ? ` · ${t(`mood.${mood.key}`)}` : ""}` : undefined}
                className={cn(
                  "aspect-square rounded-[7px]",
                  !mood && "bg-ink/5",
                  key === today && "ring-2 ring-journal ring-offset-2 ring-offset-surface",
                  key > today && "bg-ink/2",
                )}
                style={mood ? { background: mood.color } : undefined}
              />
            );
          })}
        </AnimatePresence>
      </div>

      <ul className="mt-4 grid grid-cols-5 gap-1">
        {counts.map(({ key, icon: Icon, color, ink, count }) => (
          <li key={key} className="flex flex-col items-center gap-1" title={t(`mood.${key}`)}>
            <span className="grid size-6 place-items-center rounded-full" style={{ background: color, color: ink }}>
              <Icon className="size-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[12px] font-semibold text-ink tabular-nums">{count}</span>
            <span className="sr-only">{t(`mood.${key}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyJournal({ today }: { today: string }) {
  const t = useTranslations("journal");
  const prompts = JOURNAL_PROMPTS.map((key) => t(`prompts.${key}`));
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
      className="relative overflow-hidden rounded-[24px] glass-card p-6 sm:p-8"
    >
      <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full opacity-25 blur-3xl" style={{ background: "var(--c-journal)" }} />
      <h2 className="relative text-[24px] font-semibold tracking-[-0.03em] text-ink">{t("empty.title")}</h2>
      <p className="relative mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">{t("empty.text")}</p>
      <ul className="relative mt-6 flex flex-col gap-2">
        {prompts.slice(0, 3).map((prompt, i) => (
          <motion.li key={prompt} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: EASE_OUT_EXPO }}>
            <span className="text-[14px] text-muted">“{prompt}”</span>
          </motion.li>
        ))}
      </ul>
      <ButtonLink href={`/dashboard/journal/new?date=${today}`} className="relative mt-8" style={{ background: "var(--c-journal)" }}>
        <PenLine className="size-4" />
        {t("writeFirst")}
      </ButtonLink>
    </motion.div>
  );
}
