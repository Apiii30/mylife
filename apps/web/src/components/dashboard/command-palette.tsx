"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, CornerDownLeft, FolderOpen, GraduationCap, Image as ImageIcon, ListChecks, NotebookPen, Search, Target, Wallet, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MODULES, SETTINGS_MODULE } from "@/config/modules";
import { useApi } from "@/hooks/use-api";
import { useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/queries/finance";

type SearchResponse = {
  tasks: { id: string; title: string; status: string; dueDate: string | null }[];
  events: { id: string; title: string; date: string; allDay: boolean; location: string | null }[];
  journals: { id: string; title: string | null; excerpt: string | null; date: string }[];
  goals: { id: string; title: string; status: string }[];
  transactions: { id: string; note: string | null; amount: number; type: "INCOME" | "EXPENSE"; date: string; category: { name: string } | null }[];
  photos: { id: string; caption: string | null }[];
  albums: { id: string; name: string }[];
  courses: { id: string; name: string; grade: string; credits: number; semester: { id: string; number: number } }[];
};

type Item = { key: string; group: string; icon: LucideIcon; color: string; title: string; subtitle?: string; href: string };

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Kolom pencarian di top bar — membuka command palette. */
export function SearchTrigger({ onOpen, compact }: { onOpen: () => void; compact?: boolean }) {
  const t = useTranslations("search");
  const mounted = useMounted();
  if (compact)
    return (
      <button type="button" onClick={onOpen} aria-label={t("placeholder")} className="grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink">
        <Search className="size-[19px]" />
      </button>
    );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-10 w-56 items-center gap-2.5 rounded-full bg-ink/4 pr-1.5 pl-3.5 text-left text-[13px] text-muted shadow-[inset_0_1px_2px_rgb(30_40_120/0.06)] ring-1 ring-line transition-[width,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ink/6 hover:ring-accent/30 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none lg:w-52 xl:w-72 2xl:w-80"
    >
      <Search className="size-4 shrink-0 transition-[color,transform] duration-300 group-hover:scale-110 group-hover:text-accent" />
      <span className="flex-1 truncate">{t("placeholder")}</span>
      <kbd className="hidden h-7 items-center rounded-full bg-surface px-2.5 font-sans text-[11px] font-semibold text-muted shadow-[0_0_0_1px_var(--line),0_2px_6px_-3px_rgb(30_40_120/0.2)] md:inline-flex">
        {mounted && isMac() ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{open && <Palette onClose={onClose} />}</AnimatePresence>, document.body);
}

function Palette({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const { call, ready } = useApi();
  const { money } = useMoney();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 180);
    return () => clearTimeout(id);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => call<SearchResponse>(`/search?q=${encodeURIComponent(debounced)}`),
    enabled: ready && debounced.length >= 2,
    staleTime: 30_000,
  });

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Item[] = [...MODULES, SETTINGS_MODULE]
      .map((m) => ({ key: `page:${m.key}`, group: t("search.groups.pages"), icon: m.icon, color: m.color, title: t(`dashboard.nav.${m.key}`), href: m.href }))
      .filter((p) => !q || p.title.toLowerCase().includes(q));
    if (!data || debounced.length < 2) return pages;

    const day = (d: string) => format.dateTime(new Date(d.length === 10 ? `${d}T00:00:00` : d), { day: "numeric", month: "short", year: "numeric" });
    const g = (key: "tasks" | "events" | "journals" | "goals" | "transactions" | "photos" | "courses") => t(`search.groups.${key}`);
    return [
      ...pages,
      ...data.tasks.map((x) => ({ key: `task:${x.id}`, group: g("tasks"), icon: ListChecks, color: "var(--c-tasks)", title: x.title, subtitle: x.dueDate ? day(x.dueDate) : t(`tasks.status.${x.status as "TODO"}`), href: "/dashboard/tasks" })),
      ...data.events.map((x) => ({ key: `event:${x.id}`, group: g("events"), icon: CalendarDays, color: "var(--c-calendar)", title: x.title, subtitle: [day(x.date), x.location].filter(Boolean).join(" · "), href: `/dashboard/calendar?date=${x.date.slice(0, 10)}` })),
      ...data.journals.map((x) => ({ key: `journal:${x.id}`, group: g("journals"), icon: NotebookPen, color: "var(--c-journal)", title: x.title || t("journal.untitled"), subtitle: `${day(x.date)} · ${x.excerpt ?? ""}`, href: `/dashboard/journal/${x.id}` })),
      ...data.goals.map((x) => ({ key: `goal:${x.id}`, group: g("goals"), icon: Target, color: "var(--c-goals)", title: x.title, href: `/dashboard/goals?goal=${x.id}` })),
      ...data.transactions.map((x) => ({ key: `tx:${x.id}`, group: g("transactions"), icon: Wallet, color: "var(--c-finance)", title: x.note || x.category?.name || "—", subtitle: `${x.type === "INCOME" ? "+" : "−"}${money(x.amount)} · ${day(x.date)}`, href: `/dashboard/finance?month=${x.date.slice(0, 7)}` })),
      ...data.photos.map((x) => ({ key: `photo:${x.id}`, group: g("photos"), icon: ImageIcon, color: "var(--c-gallery)", title: x.caption ?? "", href: `/dashboard/gallery?photo=${x.id}` })),
      ...data.albums.map((x) => ({ key: `album:${x.id}`, group: g("photos"), icon: FolderOpen, color: "var(--c-gallery)", title: x.name, href: `/dashboard/gallery?album=${x.id}` })),
      ...data.courses.map((x) => ({ key: `course:${x.id}`, group: g("courses"), icon: GraduationCap, color: "var(--c-grades)", title: x.name, subtitle: `${t("grades.semesterN", { n: x.semester.number })} · ${x.credits} SKS · ${x.grade}`, href: `/dashboard/grades?semester=${x.semester.id}` })),
    ];
  }, [data, debounced, query, t, format, money]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  // Pastikan item aktif selalu terlihat saat navigasi dengan keyboard
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") setActive((i) => Math.min(items.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Enter") go(items[active]);
    else if (e.key === "Escape") onClose();
    else return;
    e.preventDefault();
  }

  const searched = debounced.length >= 2;
  const noResults = searched && !isFetching && items.length === 0;
  let lastGroup = "";

  return (
    // Saat animasi keluar, overlay tidak lagi menangkap klik
    <motion.div exit={{ pointerEvents: "none" }} className="fixed inset-0 z-60 flex items-start justify-center px-3 pt-[min(14vh,120px)]">
      <motion.div className="absolute inset-0 bg-black/25 backdrop-blur-[6px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("search.placeholder")}
        initial={{ opacity: 0, scale: 0.95, y: -12, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.97, y: -6, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="glass glass-strong relative flex max-h-[min(560px,76svh)] w-full max-w-xl flex-col overflow-hidden rounded-[26px]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className={cn("size-5 shrink-0 text-muted transition-colors", isFetching && "animate-pulse text-accent")} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholderLong")}
            aria-label={t("search.placeholder")}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md bg-ink/6 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">Esc</kbd>
        </div>

        <div ref={list} className="overflow-y-auto overscroll-contain p-2" role="listbox">
          {noResults && <p className="px-4 py-10 text-center text-[14px] text-muted">{t("search.empty", { query: debounced })}</p>}
          {!searched && query.trim().length === 1 && <p className="px-4 pt-3 pb-1 text-[12px] text-muted">{t("search.hint")}</p>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={item.key}>
                {header && <p className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{header}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className="relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
                >
                  {i === active && (
                    <motion.span layoutId="palette-active" className="absolute inset-0 rounded-2xl bg-accent/10" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                  )}
                  <span
                    className="relative grid size-8 shrink-0 place-items-center rounded-xl"
                    style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 15%, transparent)` }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{item.title}</span>
                    {item.subtitle && <span className="block truncate text-[12px] text-muted">{item.subtitle}</span>}
                  </span>
                  {i === active && <ArrowRight className="relative size-4 shrink-0 text-accent" />}
                </button>
              </div>
            );
          })}
        </div>

        <footer className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-muted sm:flex">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-ink/6 px-1 font-sans">↑</kbd>
            <kbd className="rounded bg-ink/6 px-1 font-sans">↓</kbd>
            {t("search.navigate")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="grid place-items-center rounded bg-ink/6 px-1 py-0.5">
              <CornerDownLeft className="size-3" />
            </kbd>
            {t("search.open")}
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}
