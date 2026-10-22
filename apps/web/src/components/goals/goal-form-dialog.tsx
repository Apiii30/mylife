"use client";

import { LoaderCircle, Mountain, PiggyBank, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AmountInput, useAmount } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ModuleIcon } from "@/components/ui/module-icon";
import { CATEGORY_COLORS, categoryColor } from "@/config/categories";
import { GOAL_ICONS } from "@/config/goal-icons";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/queries/finance";
import { useCreateGoal, useUpdateGoal, type Goal, type GoalType } from "@/lib/queries/goals";

const COLORS = CATEGORY_COLORS.filter((c) => c !== "gray");
const EASE = [0.16, 1, 0.3, 1] as const;

type GoalFormDialogProps = { open: boolean; goal?: Goal | null; onClose: () => void; onCreated?: (goal: Goal) => void };

export function GoalFormDialog({ open, goal, onClose, onCreated }: GoalFormDialogProps) {
  const t = useTranslations("goals");
  return (
    <Dialog open={open} onClose={onClose} title={goal ? t("editGoal") : t("newGoal")}>
      <GoalForm key={goal?.id ?? "new"} goal={goal} onDone={onClose} onCreated={onCreated} />
    </Dialog>
  );
}

function GoalForm({ goal, onDone, onCreated }: { goal?: Goal | null; onDone: () => void; onCreated?: (goal: Goal) => void }) {
  const t = useTranslations("goals");
  const { currency } = useMoney();
  const create = useCreateGoal();
  const update = useUpdateGoal();

  const [type, setType] = useState<GoalType>(goal?.type ?? "FINANCIAL");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "target");
  const [color, setColor] = useState(goal?.color ?? "purple");
  const target = useAmount(goal?.targetAmount);
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [steps, setSteps] = useState<string[]>([]);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  function addStep() {
    if (!step.trim()) return;
    setSteps((s) => [...s, step.trim()]);
    setStep("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError(t("form.titleRequired"));
    if (type === "FINANCIAL" && target.value <= 0) return setError(t("form.targetRequired"));

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      icon,
      color,
      deadline: deadline || null,
      ...(type === "FINANCIAL" && { targetAmount: target.value }),
    };
    try {
      if (goal) {
        await update.mutateAsync({ id: goal.id, ...body });
        toast.success(t("toast.updated"));
      } else {
        const { goal: created } = await create.mutateAsync({ ...body, type, milestones: steps });
        toast.success(t("toast.created"));
        onCreated?.(created);
      }
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Jenis goal */}
      {!goal && (
        <div className="grid grid-cols-2 gap-2">
          {(["FINANCIAL", "LIFE"] as const).map((option) => {
            const active = option === type;
            const Icon = option === "FINANCIAL" ? PiggyBank : Mountain;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                className={cn(
                  "relative flex flex-col items-start gap-2 rounded-[20px] p-4 text-left transition-colors",
                  active ? "text-ink" : "bg-ink/4 text-ink-2 hover:bg-ink/6",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="goal-type"
                    className="absolute inset-0 rounded-[20px] ring-2"
                    style={{ background: `color-mix(in srgb, ${categoryColor(color)} 12%, var(--surface))`, ["--tw-ring-color" as string]: categoryColor(color) }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative size-5" style={active ? { color: categoryColor(color) } : undefined} />
                <span className="relative text-[15px] font-semibold">{t(`types.${option}.name`)}</span>
                <span className="relative text-[12px] leading-snug text-muted">{t(`types.${option}.desc`)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Nama & ikon */}
      <div className="flex items-center gap-3">
        <motion.div key={`${icon}-${color}`} initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
          <ModuleIcon icon={GOAL_ICONS[icon]} color={categoryColor(color)} size="lg" />
        </motion.div>
        <input
          autoFocus
          value={title}
          maxLength={120}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder={t(`form.placeholder${type}`)}
          aria-label={t("form.title")}
          className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-ink/25"
        />
      </div>
      <textarea
        value={description}
        maxLength={1000}
        rows={2}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("form.description")}
        className="-mt-2 w-full resize-none rounded-2xl bg-ink/4 px-4 py-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60"
        style={{ fieldSizing: "content", minHeight: 64 } as React.CSSProperties}
      />

      {/* Target */}
      <AnimatePresence initial={false}>
        {type === "FINANCIAL" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <div className="rounded-[20px] bg-ink/3 py-4">
              <p className="mb-1 text-center text-[12px] font-medium text-muted">{t("form.target")}</p>
              <AmountInput raw={target.raw} onRawChange={(raw) => { target.setRaw(raw); setError(null); }} currency={currency} accent={categoryColor(color)} size="md" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Langkah awal (goal kehidupan baru) */}
      <AnimatePresence initial={false}>
        {type === "LIFE" && !goal && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
            <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.milestones")}</p>
            <ol className="flex flex-col gap-1">
              <AnimatePresence initial={false}>
                {steps.map((s, i) => (
                  <motion.li key={`${s}-${i}`} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="flex items-center gap-3 rounded-xl bg-ink/4 py-2 pr-1 pl-3">
                    <span className="grid size-5 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: categoryColor(color) }}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{s}</span>
                    <button type="button" onClick={() => setSteps((all) => all.filter((_, j) => j !== i))} aria-label="×" className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5">
                      <X className="size-3.5" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
            <div className="mt-1 flex h-11 items-center gap-3 rounded-xl bg-ink/4 px-3 focus-within:ring-2 focus-within:ring-accent/50">
              <Plus className="size-4 text-muted" />
              <input
                value={step}
                maxLength={200}
                onChange={(e) => setStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep();
                  }
                }}
                placeholder={t("form.addMilestone")}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ikon */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.icon")}</p>
        <div className="grid grid-cols-10 gap-1">
          {Object.entries(GOAL_ICONS).map(([key, Icon]) => {
            const active = key === icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={key}
                className={cn("grid aspect-square place-items-center rounded-xl transition-colors", active ? "text-white" : "text-ink-2 hover:bg-ink/6")}
                style={active ? { background: categoryColor(color) } : undefined}
              >
                <Icon className="size-[18px]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Warna & tenggat */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.color")}</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn("size-7 rounded-full transition-transform", color === c ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-105")}
                style={{ background: categoryColor(c) }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.deadline")}</p>
          <div className="flex h-11 items-center rounded-[14px] bg-ink/4 pr-1 pl-3 focus-within:ring-2 focus-within:ring-accent/60">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-label={t("form.deadline")} className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
            {deadline && (
              <button type="button" onClick={() => setDeadline("")} aria-label={t("form.noDeadline")} className="grid size-7 place-items-center rounded-full text-muted hover:bg-ink/5">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-center text-[13px] font-medium text-calendar">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : goal ? t("form.save") : t("form.create")}
      </Button>
    </form>
  );
}
