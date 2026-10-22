"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { monthDate, shiftMonth } from "@/lib/month";

type MonthSwitcherProps = { month: string; currentMonth: string; onChange: (month: string) => void };

/** ◀ Oktober 2026 ▶ — label bergeser ke arah navigasi. */
export function MonthSwitcher({ month, currentMonth, onChange }: MonthSwitcherProps) {
  const t = useTranslations("finance");
  const format = useFormatter();
  const [direction, setDirection] = useState(0);

  function go(delta: number) {
    setDirection(delta);
    onChange(shiftMonth(month, delta));
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 items-center rounded-full glass-card p-1">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("prevMonth")}
          className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="relative w-36 overflow-hidden text-center">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.span
              key={month}
              custom={direction}
              variants={{
                enter: (d: number) => ({ x: d * 40, opacity: 0, filter: "blur(4px)" }),
                center: { x: 0, opacity: 1, filter: "blur(0px)" },
                exit: (d: number) => ({ x: d * -40, opacity: 0, filter: "blur(4px)" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[14px] font-semibold text-ink"
            >
              {format.dateTime(monthDate(month), { month: "long", year: "numeric", timeZone: "UTC" })}
            </motion.span>
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={month >= currentMonth}
          aria-label={t("nextMonth")}
          className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <AnimatePresence>
        {month !== currentMonth && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: "auto" }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            onClick={() => {
              setDirection(1);
              onChange(currentMonth);
            }}
            className="h-10 overflow-hidden rounded-full px-4 text-[13px] font-medium whitespace-nowrap text-accent hover:bg-accent/10"
          >
            {t("thisMonth")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
