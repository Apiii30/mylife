"use client";

import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AmountInput, useAmount } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { CATEGORY_COLORS, categoryColor } from "@/config/categories";
import { cn } from "@/lib/cn";
import { addDays, todayKey } from "@/lib/month";
import {
  useCategories,
  useCreateCategory,
  useDeleteTransaction,
  useMoney,
  useSaveTransaction,
  type Transaction,
  type TxType,
} from "@/lib/queries/finance";
import { CategoryIcon } from "./category-icon";

const EASE = [0.16, 1, 0.3, 1] as const;

type TransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Jika diisi → mode edit. */
  transaction?: Transaction | null;
};

export function TransactionDialog({ open, onClose, transaction }: TransactionDialogProps) {
  const t = useTranslations("finance");
  return (
    <Dialog open={open} onClose={onClose} title={transaction ? t("editTransaction") : t("newTransaction")}>
      {/* key → form di-reset setiap kali dibuka untuk transaksi berbeda */}
      <TransactionForm key={transaction?.id ?? "new"} transaction={transaction} onDone={onClose} />
    </Dialog>
  );
}

function TransactionForm({ transaction, onDone }: { transaction?: Transaction | null; onDone: () => void }) {
  const t = useTranslations("finance");
  const { currency } = useMoney();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const today = todayKey("Asia/Jakarta", useNow());
  const yesterday = addDays(today, -1);

  const [type, setType] = useState<TxType>(transaction?.type ?? "EXPENSE");
  const amount = useAmount(transaction?.amount);
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category?.id ?? null);
  const [date, setDate] = useState(transaction?.date ?? today);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: categories = [] } = useCategories(type);
  const accent = type === "INCOME" ? "var(--viz-income)" : "var(--viz-expense)";

  function switchType(next: TxType) {
    setType(next);
    if (next !== type) setCategoryId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = amount.value;
    if (value <= 0) {
      setError(t("form.amountRequired"));
      return;
    }
    try {
      await save.mutateAsync({ id: transaction?.id, type, amount: value, date, categoryId, note: note.trim() || null });
      toast.success(transaction ? t("toast.updated") : t("toast.created"));
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  async function onDelete() {
    if (!transaction) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await remove.mutateAsync(transaction.id);
    toast.success(t("toast.deleted"));
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Jenis transaksi */}
      <div className="grid grid-cols-2 rounded-full bg-ink/5 p-1">
        {(["EXPENSE", "INCOME"] as const).map((option) => {
          const active = option === type;
          return (
            <button
              key={option}
              type="button"
              onClick={() => switchType(option)}
              className={cn("relative h-9 rounded-full text-[14px] font-medium transition-colors", active ? "text-white" : "text-muted hover:text-ink")}
            >
              {active && (
                <motion.span
                  layoutId="tx-type"
                  className="absolute inset-0 rounded-full"
                  style={{ background: option === "INCOME" ? "var(--viz-income)" : "var(--viz-expense)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{option === "INCOME" ? t("income") : t("expense")}</span>
            </button>
          );
        })}
      </div>

      {/* Jumlah */}
      <div className="text-center">
        <label htmlFor="tx-amount" className="text-[12px] font-medium text-muted">
          {t("form.amount")}
        </label>
        <AmountInput
          id="tx-amount"
          autoFocus
          className="mt-1"
          raw={amount.raw}
          onRawChange={(raw) => {
            amount.setRaw(raw);
            setError(null);
          }}
          currency={currency}
          prefix={type === "INCOME" ? "+" : "−"}
          accent={accent}
        />
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-[12px] text-expense"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Kategori */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.category")}</p>
        <CategoryPicker type={type} categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      {/* Tanggal */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <label htmlFor="tx-date" className="text-[12px] font-medium text-muted">
            {t("form.date")}
          </label>
          <div className="flex gap-1">
            {[
              { label: t("today"), value: today },
              { label: t("yesterday"), value: yesterday },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setDate(chip.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors",
                  date === chip.value ? "bg-ink text-canvas" : "bg-ink/5 text-ink-2 hover:bg-ink/10",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
        <input
          id="tx-date"
          type="date"
          required
          value={date}
          max={addDays(today, 365)}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-[16px] bg-ink/4 px-4 text-[15px] text-ink outline-none focus:ring-2 focus:ring-accent/70"
        />
      </div>

      <Field label={t("form.note")} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />

      <div className="flex gap-2 pt-1">
        {transaction && (
          <motion.button
            type="button"
            layout
            onClick={onDelete}
            disabled={remove.isPending}
            className={cn(
              "flex h-13 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-colors",
              confirmDelete ? "bg-expense text-white" : "bg-expense/10 text-expense hover:bg-expense/15",
            )}
          >
            {remove.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            <AnimatePresence mode="popLayout" initial={false}>
              {confirmDelete && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {t("form.confirmDelete")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        <Button type="submit" size="lg" disabled={save.isPending} className="flex-1">
          {save.isPending ? <LoaderCircle className="size-5 animate-spin" /> : t("form.save")}
        </Button>
      </div>
    </form>
  );
}

// ─── Pemilih kategori + buat kategori baru di tempat ───────

type PickerProps = {
  type: TxType;
  categories: { id: string; name: string; color: string; icon: string | null }[];
  value: string | null;
  onChange: (id: string | null) => void;
};

function CategoryPicker({ type, categories, value, onChange }: PickerProps) {
  const t = useTranslations("finance.form");
  const create = useCreateCategory();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");

  async function addCategory() {
    if (!name.trim()) return;
    const category = await create.mutateAsync({ name: name.trim(), kind: type, color });
    onChange(category.id);
    setName("");
    setAdding(false);
  }

  return (
    <div>
      <motion.div layout className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {categories.map((c) => {
          const active = c.id === value;
          return (
            <motion.button
              layout
              key={c.id}
              type="button"
              onClick={() => onChange(active ? null : c.id)}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center transition-colors",
                active ? "bg-ink/7" : "hover:bg-ink/4",
              )}
            >
              <CategoryIcon icon={c.icon} color={c.color} />
              <span className="line-clamp-1 w-full text-[11px] font-medium text-ink-2">{c.name}</span>
              <AnimatePresence>
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-ink text-canvas"
                  >
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
        {!adding && (
          <motion.button
            layout
            type="button"
            onClick={() => setAdding(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-muted hover:bg-ink/4 hover:text-ink"
          >
            <span className="grid size-9 place-items-center rounded-[10px] border border-dashed border-line-strong">
              <Plus className="size-4" />
            </span>
            <span className="text-[11px] font-medium">{t("newCategory")}</span>
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl bg-ink/4 p-3">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder={t("categoryName")}
                  className="h-10 min-w-0 flex-1 rounded-xl glass-card px-3 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent/70"
                />
                <Button size="sm" className="h-10" onClick={addCategory} disabled={!name.trim() || create.isPending}>
                  {create.isPending ? <LoaderCircle className="size-4 animate-spin" /> : t("addCategory")}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "size-7 rounded-full transition-transform",
                      color === c ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-105",
                    )}
                    style={{ background: categoryColor(c) }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
