"use client";

import { Plus, Search, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { createPortal } from "react-dom";
import { BalanceSparkline } from "@/components/charts/balance-sparkline";
import { CashflowChart, ChartLegend } from "@/components/charts/cashflow-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { percentChange, toCashflowData, toDonutSegments } from "@/lib/finance-chart";
import { dayDate } from "@/lib/month";
import { useFinanceSummary, useMoney, useTransactions, type Transaction, type TxType } from "@/lib/queries/finance";
import { Delta, StatTile } from "./stat-tile";
import { MonthSwitcher } from "./month-switcher";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionList } from "./transaction-list";

type Filter = "ALL" | TxType;

export function FinanceView({ initialMonth, currentMonth }: { initialMonth: string; currentMonth: string }) {
  const t = useTranslations("finance");
  const locale = useLocale();
  const format = useFormatter();
  const { money, compact } = useMoney();
  const mounted = useMounted();

  const [month, setMonthState] = useState(initialMonth);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const [dialog, setDialog] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null });

  const summary = useFinanceSummary(month);
  const transactions = useTransactions(month, { type: filter === "ALL" ? undefined : filter, q: q || undefined });
  const s = summary.data;
  const refetching = summary.isPlaceholderData;

  function setMonth(next: string) {
    setMonthState(next);
    window.history.replaceState(null, "", `?month=${next}`);
  }

  const openNew = () => setDialog({ open: true, tx: null });
  const segments = s ? toDonutSegments(s.byCategory, { others: t("others"), uncategorized: t("uncategorized") }) : [];
  const txCount = transactions.data?.length ?? 0;

  return (
    <>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={Wallet} color="var(--c-finance)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">{t("count", { count: txCount })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSwitcher month={month} currentMonth={currentMonth} onChange={setMonth} />
          <Button onClick={openNew} className="hidden md:inline-flex">
            <Plus className="size-4" strokeWidth={2.5} />
            {t("addTransaction")}
          </Button>
        </div>
      </header>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label={t("balance")} value={s?.totals.balance ?? 0} format={money} dimmed={refetching} index={0} className="col-span-2 sm:col-span-1" valueClassName="text-[1.65rem] sm:text-[clamp(1.25rem,2.2vw,1.65rem)]">
          <div className="mt-2 -mb-1">
            <BalanceSparkline
              height={44}
              format={money}
              color={(s?.totals.balance ?? 0) < 0 ? "var(--viz-expense)" : "var(--viz-income)"}
              points={(s?.daily ?? []).map((d) => ({
                label: format.dateTime(dayDate(d.date), { day: "numeric", month: "short", timeZone: "UTC" }),
                value: d.balance,
              }))}
            />
          </div>
        </StatTile>
        <StatTile
          label={t("income")}
          value={s?.totals.income ?? 0}
          format={money}
          color="var(--viz-income)"
          dimmed={refetching}
          index={1}
          delta={<Delta change={percentChange(s?.totals.income ?? 0, s?.previous?.income)} goodWhenUp />}
        />
        <StatTile
          label={t("expense")}
          value={s?.totals.expense ?? 0}
          format={money}
          color="var(--viz-expense)"
          dimmed={refetching}
          index={2}
          delta={<Delta change={percentChange(s?.totals.expense ?? 0, s?.previous?.expense)} goodWhenUp={false} />}
        />
      </div>

      {/* Grafik */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card
          index={3}
          className={cn("lg:col-span-3 transition-opacity", refetching && "opacity-60")}
          title={t("cashflow")}
          subtitle={t("cashflowSub")}
          action={
            <ChartLegend
              items={[
                { label: t("income"), color: "var(--viz-income)" },
                { label: t("expense"), color: "var(--viz-expense)" },
              ]}
            />
          }
        >
          <CashflowChart
            data={s ? toCashflowData(s.monthly, locale) : []}
            format={money}
            compact={compact}
            selected={month}
            onSelect={(key) => key <= currentMonth && setMonth(key)}
            labels={{ income: t("income"), expense: t("expense"), net: t("net"), empty: t("emptyChart") }}
          />
        </Card>
        <Card index={4} className={cn("lg:col-span-2 transition-opacity", refetching && "opacity-60")} title={t("spending")}>
          <DonutChart
            layout="stack"
            size={176}
            segments={segments}
            format={money}
            totalLabel={t("expense")}
            emptyText={t("emptySpending")}
          />
        </Card>
      </div>

      {/* Daftar transaksi */}
      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t("transactions")}</h2>
          <div className="flex items-center gap-2">
            <div className="relative grid grid-cols-3 rounded-full bg-ink/5 p-1">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    "relative h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
                    filter === option ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {filter === option && (
                    <motion.span
                      layoutId="tx-filter"
                      className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{option === "ALL" ? t("all") : option === "INCOME" ? t("income") : t("expense")}</span>
                </button>
              ))}
            </div>
            <label className="relative flex-1 sm:w-56 sm:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search")}
                className="h-10 w-full rounded-full glass-card pr-4 pl-9 text-[14px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60"
              />
            </label>
          </div>
        </div>

        <div className={cn("transition-opacity", transactions.isPlaceholderData && "opacity-60")}>
          {transactions.data && transactions.data.length > 0 ? (
            <TransactionList transactions={transactions.data} onSelect={(tx) => setDialog({ open: true, tx })} />
          ) : transactions.data ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 rounded-[28px] border border-dashed border-line-strong px-6 py-14 text-center"
            >
              <p className="text-[15px] font-medium text-ink">{q || filter !== "ALL" ? t("noResults") : t("empty")}</p>
              {!q && filter === "ALL" && (
                <>
                  <p className="-mt-2 text-[14px] text-muted">{t("emptyHint")}</p>
                  <Button onClick={openNew} size="sm">
                    <Plus className="size-4" strokeWidth={2.5} />
                    {t("addTransaction")}
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[22px] bg-ink/4" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tombol tambah melayang (ponsel) — lewat portal agar `fixed` relatif ke layar */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {!dialog.open && (
              <motion.button
                type="button"
                onClick={openNew}
                aria-label={t("addTransaction")}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="fixed right-5 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] z-30 grid size-14 place-items-center rounded-full bg-ink text-canvas shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] md:hidden"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <TransactionDialog open={dialog.open} transaction={dialog.tx} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </>
  );
}
