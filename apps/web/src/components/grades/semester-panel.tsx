"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { CountUp } from "@/components/ui/count-up";
import { Popover } from "@/components/ui/popover";
import { formatGpa, gpa, gradeColor, points, SCALE_GRADES, type Course, type GradeScale, type Semester } from "@/lib/grades";
import { cn } from "@/lib/cn";
import { useAddCourse, useDeleteCourse, useDeleteSemester, useUpdateCourse, useUpdateSemester } from "@/lib/queries/grades";

const EASE = [0.16, 1, 0.3, 1] as const;

type SemesterPanelProps = { semester: Semester; scale: GradeScale; onDeleted: () => void };

export function SemesterPanel({ semester, scale, onDeleted }: SemesterPanelProps) {
  const t = useTranslations("grades");
  const locale = useLocale();
  const updateSemester = useUpdateSemester();
  const removeSemester = useDeleteSemester();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [label, setLabel] = useState(semester.label ?? "");
  const ip = gpa(semester.courses);

  function saveLabel() {
    const next = label.trim() || null;
    if (next !== semester.label) updateSemester.mutate({ id: semester.id, label: next });
  }

  function onDelete() {
    if (!confirmDelete) return setConfirmDelete(true);
    removeSemester.mutate(semester.id, { onSuccess: () => toast.success(t("toast.semesterDeleted")) });
    onDeleted();
  }

  return (
    <section className="glass-card overflow-hidden rounded-[24px]">
      <header className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{t("semesterN", { n: semester.number })}</h2>
          <input
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder={t("labelPlaceholder")}
            aria-label={t("labelPlaceholder")}
            className="mt-0.5 w-full max-w-xs rounded-lg bg-transparent text-[14px] text-muted outline-none placeholder:text-subtle focus:text-ink"
          />
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[12px] font-medium text-muted">{t("ip")}</p>
            <CountUp
              value={ip.value ?? 0}
              format={(n) => (ip.value === null ? "–" : formatGpa(n, locale))}
              className="block text-[34px] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums"
            />
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-muted">{t("credits")}</p>
            <p className="text-[22px] leading-none font-semibold text-ink-2 tabular-nums">{ip.credits}</p>
          </div>
          <motion.button
            type="button"
            layout
            onClick={onDelete}
            onBlur={() => setConfirmDelete(false)}
            aria-label={t("deleteSemester")}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-colors",
              confirmDelete ? "bg-calendar text-white" : "text-muted hover:bg-calendar/10 hover:text-calendar",
            )}
          >
            <Trash2 className="size-4" />
            {confirmDelete && <span className="whitespace-nowrap">{t("confirmDeleteSemester")}</span>}
          </motion.button>
        </div>
      </header>

      {/* Kepala tabel (desktop) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_92px_64px_36px] gap-3 px-6 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase md:grid">
        <span>{t("course")}</span>
        <span className="text-center">{t("credits")}</span>
        <span className="text-center">{t("grade")}</span>
        <span className="text-right">{t("quality")}</span>
        <span />
      </div>

      <ul className="flex flex-col px-3 pb-2 sm:px-4">
        <AnimatePresence initial={false}>
          {semester.courses.map((course) => (
            <CourseRow key={course.id} course={course} scale={scale} />
          ))}
        </AnimatePresence>
        {semester.courses.length === 0 && <li className="px-3 py-8 text-center text-[14px] text-muted">{t("emptyCourses")}</li>}
      </ul>

      <AddCourse semesterId={semester.id} scale={scale} />
    </section>
  );
}

function CourseRow({ course, scale }: { course: Course; scale: GradeScale }) {
  const t = useTranslations("grades");
  const locale = useLocale();
  const update = useUpdateCourse();
  const remove = useDeleteCourse();
  const [name, setName] = useState(course.name);
  const [code, setCode] = useState(course.code ?? "");
  const pending = course.id.startsWith("tmp-");

  const save = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch, { onError: () => toast.error(t("toast.error")) });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: EASE }}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5 transition-colors hover:bg-ink/3 md:grid-cols-[minmax(0,1fr)_120px_92px_64px_36px]"
    >
      <div className="col-span-2 min-w-0 md:col-span-1">
        <input
          value={name}
          maxLength={120}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== course.name && save({ id: course.id, name: name.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label={t("course")}
          className="w-full truncate rounded-md bg-transparent text-[15px] font-medium text-ink outline-none focus:bg-ink/4"
        />
        <input
          value={code}
          maxLength={20}
          disabled={pending}
          onChange={(e) => setCode(e.target.value)}
          onBlur={() => code.trim() !== (course.code ?? "") && save({ id: course.id, code: code.trim() || null })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder={t("codePlaceholder")}
          aria-label={t("codePlaceholder")}
          className="w-full rounded-md bg-transparent text-[12px] text-muted uppercase outline-none placeholder:normal-case placeholder:text-subtle focus:bg-ink/4"
        />
      </div>
      <Stepper value={course.credits} onChange={(credits) => save({ id: course.id, credits })} label={t("credits")} disabled={pending} />
      <div className="flex justify-end md:justify-center">
        <GradePicker value={course.grade} scale={scale} onChange={(grade) => save({ id: course.id, grade })} disabled={pending} />
      </div>
      <span className="hidden text-right text-[14px] font-semibold text-ink-2 tabular-nums md:block">
        {(points(course.grade) * course.credits).toLocaleString(locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 })}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => remove.mutate(course.id)}
        aria-label={t("deleteCourse")}
        className="hidden size-8 place-items-center rounded-full text-subtle opacity-0 transition-all group-hover:opacity-100 hover:bg-calendar/10 hover:text-calendar focus-visible:opacity-100 md:grid"
      >
        <Trash2 className="size-4" />
      </button>
    </motion.li>
  );
}

function Stepper({ value, onChange, label, disabled }: { value: number; onChange: (n: number) => void; label: string; disabled?: boolean }) {
  const button = "grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-ink/8 hover:text-ink disabled:opacity-30";
  return (
    <div className="flex w-fit items-center justify-center gap-1 justify-self-start rounded-full bg-ink/4 p-0.5 md:justify-self-center" aria-label={label}>
      <button type="button" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label="−" className={button}>
        <Minus className="size-3.5" />
      </button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 8, opacity: 0 }}
          className="w-6 text-center text-[14px] font-semibold text-ink tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <button type="button" disabled={disabled || value >= 24} onClick={() => onChange(value + 1)} aria-label="+" className={button}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/** Chip huruf mutu; klik untuk memilih dari skala yang dipakai user. */
export function GradePicker({ value, scale, onChange, disabled }: { value: string; scale: GradeScale; onChange: (g: string) => void; disabled?: boolean }) {
  const t = useTranslations("grades");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const color = gradeColor(value);
  // Nilai lama dari skala lain tetap bisa ditampilkan & diganti
  const options = SCALE_GRADES[scale].includes(value) ? SCALE_GRADES[scale] : [value, ...SCALE_GRADES[scale]];

  return (
    <Popover
      open={open}
      onClose={close}
      className="w-60 p-2"
      trigger={
        <motion.button
          type="button"
          disabled={disabled}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen((o) => !o)}
          aria-label={`${t("grade")}: ${value}`}
          className="h-9 min-w-14 rounded-full px-3 text-[15px] font-bold tabular-nums transition-colors"
          style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}
        >
          {value}
        </motion.button>
      }
    >
      <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("pickGrade")}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((grade) => {
          const c = gradeColor(grade);
          const active = grade === value;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => {
                onChange(grade);
                close();
              }}
              className={cn("flex flex-col items-center rounded-xl py-2 transition-transform active:scale-95", active && "ring-2")}
              style={{ background: `color-mix(in srgb, ${c} ${active ? 22 : 12}%, transparent)`, ["--tw-ring-color" as string]: c }}
            >
              <span className="text-[16px] font-bold" style={{ color: c }}>
                {grade}
              </span>
              <span className="text-[11px] text-muted tabular-nums">{points(grade).toFixed(2)}</span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

/** Baris tambah cepat: ketik nama → atur SKS & nilai → Enter. Fokus kembali ke nama untuk entri berikutnya. */
function AddCourse({ semesterId, scale }: { semesterId: string; scale: GradeScale }) {
  const t = useTranslations("grades");
  const add = useAddCourse();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(3);
  const [grade, setGrade] = useState(SCALE_GRADES[scale][0]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return nameRef.current?.focus();
    add.mutate({ semesterId, name: name.trim(), code: code.trim() || null, credits, grade }, { onError: () => toast.error(t("toast.error")) });
    setName("");
    setCode("");
    nameRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line bg-ink/2 px-6 py-4 md:grid-cols-[minmax(0,1fr)_120px_92px_100px]">
      <div className="col-span-2 flex min-w-0 gap-2 md:col-span-1">
        <input
          ref={nameRef}
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addPlaceholder")}
          aria-label={t("course")}
          className="h-10 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-[var(--c-grades)]/50"
        />
        <input
          value={code}
          maxLength={20}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("codePlaceholder")}
          aria-label={t("codePlaceholder")}
          className="h-10 w-24 rounded-xl bg-surface px-3 text-[13px] text-ink uppercase outline-none placeholder:normal-case placeholder:text-muted focus:ring-2 focus:ring-[var(--c-grades)]/50"
        />
      </div>
      <Stepper value={credits} onChange={setCredits} label={t("credits")} />
      <div className="flex justify-end md:justify-center">
        <GradePicker value={grade} scale={scale} onChange={setGrade} />
      </div>
      <button
        type="submit"
        className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-95 md:col-span-1"
        style={{ background: "var(--c-grades)" }}
      >
        <Plus className="size-4" strokeWidth={2.5} />
        {t("addCourse")}
      </button>
    </form>
  );
}
