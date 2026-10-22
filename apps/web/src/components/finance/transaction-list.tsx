"use client";

import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { addDays, dayDate, todayKey } from "@/lib/month";
import { useMoney, type Transaction } from "@/lib/queries/finance";
import { CategoryIcon } from "./category-icon";

const EASE = [0.16, 1, 0.3, 1] as const;

function groupByDate(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) groups.set(tx.date, [...(groups.get(tx.date) ?? []), tx]);
  return [...groups.entries()];
}

type TransactionListProps = {
  transactions: Transaction[];
  onSelect: (tx: Transaction) => void;
  /** Batasi jumlah baris (mis. widget ringkasan). */
  limit?: number;
  compact?: boolean;
};

export function TransactionList({ transactions, onSelect, limit, compact }: TransactionListProps) {
  const t = useTranslations("finance");
  const format = useFormatter();
  const { money } = useMoney();
  const today = todayKey("Asia/Jakarta", useNow());
  const yesterday = addDays(today, -1);

  const rows = limit ? transactions.slice(0, limit) : transactions;

  const dayLabel = (date: string) => {
    if (date === today) return t("today");
    if (date === yesterday) return t("yesterday");
    return format.dateTime(dayDate(date), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  };

  return (
    <div className={cn("flex flex-col", compact ? "gap-0.5" : "gap-5")}>
      <AnimatePresence initial={false} mode="popLayout">
        {groupByDate(rows).map(([date, items]) => {
          const net = items.reduce((sum, tx) => sum + (tx.type === "INCOME" ? tx.amount : -tx.amount), 0);
          return (
            <motion.section
              key={date}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              {!compact && (
                <header className="mb-1.5 flex items-baseline justify-between px-3">
                  <h3 className="text-[13px] font-semibold text-ink-2">{dayLabel(date)}</h3>
                  <span className="text-[12px] text-muted tabular-nums">
                    {net > 0 ? "+" : net < 0 ? "−" : ""}
                    {money(Math.abs(net))}
                  </span>
                </header>
              )}
              <ul className={cn(!compact && "overflow-hidden rounded-[22px] glass-card")}>
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((tx) => (
                    <motion.li
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: 24, filter: "blur(4px)" }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className={cn(!compact && "border-b border-line last:border-0")}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(tx)}
                        className={cn(
                          "group flex w-full items-center gap-3 text-left transition-colors hover:bg-ink/3 active:bg-ink/5",
                          compact ? "rounded-xl px-2 py-1.5" : "px-4 py-3",
                        )}
                      >
                        <CategoryIcon icon={tx.category?.icon} color={tx.category?.color} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-ink">
                            {tx.note || tx.category?.name || t("uncategorized")}
                          </p>
                          <p className="truncate text-[12px] text-muted">
                            {compact ? dayLabel(tx.date) : tx.note ? (tx.category?.name ?? t("uncategorized")) : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-[14px] font-semibold tabular-nums",
                            tx.type === "INCOME" ? "text-income" : "text-ink",
                          )}
                        >
                          {tx.type === "INCOME" ? "+" : "−"}
                          {money(tx.amount)}
                        </span>
                        {!compact && (
                          <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                        )}
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
