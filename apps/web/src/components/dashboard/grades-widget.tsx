"use client";

import { Award } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CountUp } from "@/components/ui/count-up";
import { formatGpa, gpa, predicate, progression } from "@/lib/grades";
import { useGrades } from "@/lib/queries/grades";
import { EmptyState, Widget } from "./widget";

/** IPK + predikat + batang IP tiap semester. */
export function GradesWidget({ index }: { index: number }) {
  const t = useTranslations("grades");
  const tOverview = useTranslations("dashboard.overview");
  const locale = useLocale();
  const { data, isLoading } = useGrades();
  const semesters = data?.semesters ?? [];
  const rows = progression(semesters).filter((r) => r.ip !== null);
  const ipk = gpa(semesters.flatMap((s) => s.courses)).value;
  const pred = predicate(ipk);

  return (
    <Widget module="grades" title={tOverview("grades")} index={index}>
      {!isLoading && ipk === null ? (
        <EmptyState module="grades" text={tOverview("empty.grades")} cta={tOverview("empty.gradesCta")} />
      ) : (
        <Link href="/dashboard/grades" className="flex flex-1 flex-col justify-between gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-muted">{t("ipk")}</p>
              <CountUp value={ipk ?? 0} format={(n) => formatGpa(n, locale)} className="block text-[34px] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums" />
            </div>
            {pred && (
              <span
                className="mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ color: "var(--c-grades)", background: "color-mix(in srgb, var(--c-grades) 14%, transparent)" }}
              >
                <Award className="size-3" />
                {t(`predicate.${pred}`)}
              </span>
            )}
          </div>
          <div className="flex h-16 items-end gap-1.5" role="img" aria-label={rows.map((r) => `S${r.semester.number} ${formatGpa(r.ip, locale)}`).join(", ")}>
            {rows.slice(-8).map((r, i, all) => (
              <div key={r.semester.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <motion.div
                  className="w-full max-w-7 rounded-t-[6px] rounded-b-[2px]"
                  style={{ height: `${((r.ip ?? 0) / 4) * 100}%`, originY: 1, background: i === all.length - 1 ? "var(--c-grades)" : "color-mix(in srgb, var(--c-grades) 35%, transparent)" }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.05 }}
                />
                <span className="text-[10px] text-muted">S{r.semester.number}</span>
              </div>
            ))}
          </div>
        </Link>
      )}
    </Widget>
  );
}
