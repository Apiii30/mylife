"use client";

import { Award, GraduationCap, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { ModuleIcon } from "@/components/ui/module-icon";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { formatGpa, gpa, predicate, progression } from "@/lib/grades";
import { cn } from "@/lib/cn";
import { useCreateSemester, useGrades } from "@/lib/queries/grades";
import { GpaChart } from "./gpa-chart";
import { SemesterPanel } from "./semester-panel";

export function GradesView({ initialSemesterId }: { initialSemesterId?: string }) {
  const t = useTranslations("grades");
  const locale = useLocale();
  const { data, isLoading } = useGrades();
  const create = useCreateSemester();
  const [selectedId, setSelectedId] = useState<string | null>(initialSemesterId ?? null);

  const semesters = useMemo(() => data?.semesters ?? [], [data]);
  const scale = data?.scale ?? "LETTER_AB";
  const rows = useMemo(() => progression(semesters), [semesters]);
  const all = gpa(semesters.flatMap((s) => s.courses));
  const ipk = all.value;
  const pred = predicate(ipk);
  const courseCount = semesters.reduce((n, s) => n + s.courses.length, 0);
  // Default: semester terakhir
  const selected = semesters.find((s) => s.id === selectedId) ?? semesters.at(-1) ?? null;
  const fmt = (n: number | null) => formatGpa(n, locale);

  function select(id: string) {
    setSelectedId(id);
    window.history.replaceState(null, "", `?semester=${id}`);
  }

  function addSemester() {
    create.mutate(
      {},
      {
        onSuccess: (semester) => {
          select(semester.id);
          toast.success(t("toast.semesterCreated", { n: semester.number }));
        },
        onError: () => toast.error(t("toast.error")),
      },
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={GraduationCap} color="var(--c-grades)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">
              {semesters.length ? t("summary", { ipk: fmt(ipk), credits: all.credits, semesters: semesters.length }) : t("subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={addSemester} disabled={create.isPending} style={{ background: "var(--c-grades)" }} className="self-start md:self-auto">
          <Plus className="size-4" strokeWidth={2.5} />
          {t("addSemester")}
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-[24px] bg-ink/5" />
          <div className="h-64 animate-pulse rounded-[24px] bg-ink/5 lg:col-span-2" />
        </div>
      ) : semesters.length === 0 ? (
        <EmptyGrades onAdd={addSemester} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* IPK */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="glass-card relative flex flex-col items-center overflow-hidden rounded-[24px] p-5"
            >
              <div aria-hidden className="absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "var(--c-grades)" }} />
              <p className="relative self-start text-[14px] font-semibold text-ink">{t("ipk")}</p>
              <Gauge value={ipk ?? 0} format={(n) => (ipk === null ? "–" : fmt(n))} max={fmt(4)} />
              <AnimatePresence>
                {pred && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 400, damping: 22 }}
                    className="relative -mt-2 flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
                    style={{ color: "var(--c-grades)", background: "color-mix(in srgb, var(--c-grades) 14%, transparent)" }}
                  >
                    <Award className="size-3.5" />
                    {t(`predicate.${pred}`)}
                  </motion.span>
                )}
              </AnimatePresence>
              <dl className="relative mt-4 grid w-full grid-cols-3 gap-2 text-center">
                {[
                  [t("totalCredits"), all.credits],
                  [t("courses"), courseCount],
                  [t("semesters"), semesters.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-ink/4 px-2 py-2">
                    <dd className="text-[17px] font-semibold text-ink tabular-nums">{value}</dd>
                    <dt className="text-[11px] text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            </motion.section>

            {/* Perkembangan */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.08 }}
              className="glass-card rounded-[24px] p-4 sm:p-5 lg:col-span-2"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-ink">{t("progress")}</h2>
                <div className="flex items-center gap-4 text-[12px] text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-[var(--viz-1)]" />
                    {t("ip")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border-2 border-ink-2" />
                    {t("ipkCumulative")}
                  </span>
                </div>
              </div>
              <GpaChart
                data={rows.map((r) => ({
                  key: r.semester.id,
                  label: `S${r.semester.number}`,
                  fullLabel: r.semester.label ? `${t("semesterN", { n: r.semester.number })} · ${r.semester.label}` : t("semesterN", { n: r.semester.number }),
                  ip: r.ip,
                  cumulative: r.cumulative,
                  credits: r.credits,
                }))}
                format={fmt}
                labels={{ ip: t("ip"), ipk: t("ipkCumulative"), credits: (n) => t("creditsN", { n }) }}
                selected={selected?.id}
                onSelect={select}
              />
            </motion.section>
          </div>

          {/* Pilih semester */}
          <div className="-mx-4 mt-8 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {rows.map(({ semester, ip }) => {
              const active = semester.id === selected?.id;
              return (
                <button
                  key={semester.id}
                  type="button"
                  onClick={() => select(semester.id)}
                  className={cn("relative flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors", active ? "text-white" : "glass-card text-ink-2 hover:text-ink")}
                >
                  {active && (
                    <motion.span
                      layoutId="semester-pill"
                      className="absolute inset-0 rounded-full shadow-[0_8px_20px_-8px_var(--c-grades)]"
                      style={{ background: "var(--c-grades)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{t("semesterN", { n: semester.number })}</span>
                  <span className={cn("relative rounded-full px-1.5 text-[12px] font-semibold tabular-nums", active ? "bg-white/20" : "bg-ink/5 text-muted")}>{fmt(ip)}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={addSemester}
              aria-label={t("addSemester")}
              className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-line-strong text-muted transition-colors hover:border-[var(--c-grades)] hover:text-[var(--c-grades)]"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
              >
                <SemesterPanel semester={selected} scale={scale} onDeleted={() => setSelectedId(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

/** Busur setengah lingkaran 0–4 yang terisi sesuai IPK. */
function Gauge({ value, format, max }: { value: number; format: (n: number) => string; max: string }) {
  const r = 84;
  const arc = `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`;
  return (
    <div className="relative mt-3 w-full max-w-[200px]">
      <svg viewBox="0 0 200 112" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0" x2="1">
            <stop offset="0%" stopColor="color-mix(in srgb, var(--c-grades) 55%, var(--accent))" />
            <stop offset="100%" stopColor="var(--c-grades)" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="var(--line-strong)" strokeWidth={14} strokeLinecap="round" />
        <motion.path
          d={arc}
          fill="none"
          stroke="url(#gauge-fill)"
          strokeWidth={14}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, value / 4) }}
          transition={{ duration: 1.4, ease: EASE_OUT_EXPO, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <CountUp value={value} format={format} className="block text-[36px] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums" />
        <span className="text-[12px] text-muted">/ {max}</span>
      </div>
    </div>
  );
}

function EmptyGrades({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("grades");
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
      className="glass-card relative flex flex-col items-center gap-4 overflow-hidden rounded-[24px] px-6 py-12 text-center"
    >
      <div aria-hidden className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: "var(--c-grades)" }} />
      <ModuleIcon icon={GraduationCap} color="var(--c-grades)" size="lg" className="relative" />
      <h2 className="relative text-[22px] font-semibold tracking-[-0.02em] text-ink">{t("empty.title")}</h2>
      <p className="relative max-w-md text-[14px] leading-relaxed text-muted">{t("empty.text")}</p>
      <Button onClick={onAdd} className="relative mt-2" style={{ background: "var(--c-grades)" }}>
        <Plus className="size-4" strokeWidth={2.5} />
        {t("empty.cta")}
      </Button>
    </motion.div>
  );
}
