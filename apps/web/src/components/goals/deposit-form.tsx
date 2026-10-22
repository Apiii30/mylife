"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AmountInput, useAmount } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { categoryColor } from "@/config/categories";
import { useGoalHelpers } from "@/hooks/use-goal-helpers";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/queries/finance";
import { useAddDeposit, type Goal } from "@/lib/queries/goals";

export function DepositForm({ goal, onDone }: { goal: Goal; onDone: () => void }) {
  const t = useTranslations("goals");
  const { currency } = useMoney();
  const { today, money } = useGoalHelpers();
  const add = useAddDeposit();
  const amount = useAmount();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [record, setRecord] = useState(true);
  const color = categoryColor(goal.color);
  const remaining = goal.targetAmount ? Math.max(0, goal.targetAmount - goal.saved) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (amount.value <= 0) return;
    try {
      await add.mutateAsync({ goalId: goal.id, amount: amount.value, date, note: note.trim() || null, recordTransaction: record });
      toast.success(t("toast.deposited"));
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[20px] bg-ink/3 p-4">
      <p className="text-center text-[12px] font-medium text-muted">{t("deposit.title")}</p>
      <AmountInput raw={amount.raw} onRawChange={amount.setRaw} currency={currency} prefix="+" accent={color} autoFocus size="md" />
      {remaining > 0 && (
        <div className="flex justify-center gap-1.5">
          {[0.1, 0.25, 1].map((part) => {
            const value = Math.ceil(remaining * part);
            return (
              <button
                key={part}
                type="button"
                onClick={() => amount.setRaw(String(value))}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  amount.value === value ? "bg-ink text-canvas" : "glass-card text-ink-2 hover:text-ink",
                )}
              >
                {part === 1 ? t("deposit.finish", { amount: money(value) }) : money(value)}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={t("deposit.date")}
          className="h-11 rounded-[14px] glass-card px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent/60"
        />
        <input
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("deposit.note")}
          className="h-11 min-w-0 rounded-[14px] glass-card px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60"
        />
      </div>
      <Switch checked={record} onChange={setRecord} label={t("deposit.record")} color={color} />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDone} className="flex-1">
          {t("deposit.cancel")}
        </Button>
        <Button type="submit" disabled={amount.value <= 0 || add.isPending} className="flex-1" style={{ background: color }}>
          {add.isPending ? <LoaderCircle className="size-4 animate-spin" /> : t("deposit.save")}
        </Button>
      </div>
    </form>
  );
}
