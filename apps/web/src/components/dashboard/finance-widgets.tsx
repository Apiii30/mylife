"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BalanceSparkline } from "@/components/charts/balance-sparkline";
import { CashflowChart, ChartLegend } from "@/components/charts/cashflow-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { AnimatedNumber, Delta } from "@/components/finance/stat-tile";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { TransactionList } from "@/components/finance/transaction-list";
import { percentChange, toCashflowData, toDonutSegments } from "@/lib/finance-chart";
import { dayDate } from "@/lib/month";
import { useFinanceSummary, useMoney, useTransactions, type Transaction } from "@/lib/queries/finance";
import { Widget } from "./widget";

export function BalanceWidget({ month, index }: { month: string; index: number }) {
  const t = useTranslations("finance");
  const tOverview = useTranslations("dashboard.overview");
  const format = useFormatter();
  const { money } = useMoney();
  const { data: s } = useFinanceSummary(month);
  const { data: transactions } = useTransactions(month);
  const [dialog, setDialog] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null });

  const balance = s?.totals.balance ?? 0;

  return (
    <Widget module="finance" title={tOverview("balance")} className="md:col-span-2" index={index}>
      <div className="grid flex-1 gap-5 sm:grid-cols-[1.1fr_1fr]">
        <div className="flex min-w-0 flex-col">
          <AnimatedNumber
            value={balance}
            format={money}
            className="block truncate text-[clamp(1.75rem,3.2vw,2.25rem)] leading-tight font-semibold tracking-[-0.045em] text-ink"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: t("income"), value: s?.totals.income ?? 0, prev: s?.previous?.income, color: "var(--viz-income)", good: true },
              { label: t("expense"), value: s?.totals.expense ?? 0, prev: s?.previous?.expense, color: "var(--viz-expense)", good: false },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-ink/3 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                  <span className="size-2 rounded-[2px]" style={{ background: item.color }} />
                  {item.label}
                </p>
                <AnimatedNumber value={item.value} format={money} className="mt-0.5 block truncate text-[15px] font-semibold text-ink" />
                <div className="mt-1 [&_span.text-muted]:hidden">
                  <Delta change={percentChange(item.value, item.prev)} goodWhenUp={item.good} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-3">
            <BalanceSparkline
              height={52}
              format={money}
              color={balance < 0 ? "var(--viz-expense)" : "var(--viz-income)"}
              points={(s?.daily ?? []).map((d) => ({
                label: format.dateTime(dayDate(d.date), { day: "numeric", month: "short", timeZone: "UTC" }),
                value: d.balance,
              }))}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink-2">{t("transactions")}</p>
            <Link href="/dashboard/finance" className="text-[12px] font-medium text-accent hover:underline">
              {t("viewAll")}
            </Link>
          </div>
          {transactions && transactions.length > 0 ? (
            <TransactionList compact limit={4} transactions={transactions} onSelect={(tx) => setDialog({ open: true, tx })} />
          ) : (
            <p className="py-4 text-[14px] text-muted">{tOverview("empty.finance")}</p>
          )}
          <div aria-hidden className="min-h-3 flex-1" />
          <button
            type="button"
            onClick={() => setDialog({ open: true, tx: null })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-finance/12 text-[13px] font-semibold text-finance transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            {tOverview("empty.financeCta")}
          </button>
        </div>
      </div>
      <TransactionDialog open={dialog.open} transaction={dialog.tx} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </Widget>
  );
}

export function CashflowWidget({ month, index }: { month: string; index: number }) {
  const t = useTranslations("finance");
  const locale = useLocale();
  const router = useRouter();
  const { money, compact } = useMoney();
  const { data: s } = useFinanceSummary(month);

  return (
    <Widget module="finance" title={t("cashflow")} className="md:col-span-2" index={index}>
      <div className="-mt-2 mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted">{t("cashflowSub")}</p>
        <ChartLegend
          items={[
            { label: t("income"), color: "var(--viz-income)" },
            { label: t("expense"), color: "var(--viz-expense)" },
          ]}
        />
      </div>
      <CashflowChart
        data={s ? toCashflowData(s.monthly, locale) : []}
        format={money}
        compact={compact}
        selected={month}
        onSelect={(key) => router.push(`/dashboard/finance?month=${key}`)}
        labels={{ income: t("income"), expense: t("expense"), net: t("net"), empty: t("emptyChart") }}
      />
    </Widget>
  );
}

export function SpendingWidget({ month, index }: { month: string; index: number }) {
  const t = useTranslations("finance");
  const { money } = useMoney();
  const { data: s } = useFinanceSummary(month);
  const segments = s ? toDonutSegments(s.byCategory, { others: t("others"), uncategorized: t("uncategorized") }) : [];

  return (
    <Widget module="finance" title={t("spending")} index={index}>
      <DonutChart layout="stack" size={152} segments={segments} format={money} totalLabel={t("expense")} emptyText={t("emptySpending")} />
    </Widget>
  );
}
