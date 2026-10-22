"use client";

import { Archive, ArchiveRestore, Link2, PiggyBank, Pencil, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/finance/stat-tile";
import { LiquidProgress } from "@/components/ui/liquid-progress";
import { ModuleIcon } from "@/components/ui/module-icon";
import { categoryColor } from "@/config/categories";
import { goalIcon } from "@/config/goal-icons";
import { useGoalHelpers } from "@/hooks/use-goal-helpers";
import { useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { dayDate } from "@/lib/month";
import { useAddMilestone, useDeleteDeposit, useDeleteGoal, useGoalDeposits, useUpdateGoal, type Goal } from "@/lib/queries/goals";
import { DepositForm } from "./deposit-form";
import { DeadlineChip, GoalBar, MilestoneList } from "./goal-parts";

const EASE = [0.16, 1, 0.3, 1] as const;

type GoalDetailProps = {
  goal: Goal | null;
  startWithDeposit?: boolean;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
};

/** Panel detail yang "tumbuh" dari kartunya (shared layoutId). */
export function GoalDetail({ goal, startWithDeposit, onClose, onEdit }: GoalDetailProps) {
  const mounted = useMounted();

  useEffect(() => {
    if (!goal) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [goal, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {goal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/35 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            layoutId={`goal-${goal.id}`}
            role="dialog"
            aria-modal="true"
            aria-label={goal.title}
            style={{ borderRadius: 32 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="relative flex max-h-[92svh] w-full max-w-2xl flex-col overflow-hidden bg-[var(--glass-bg-strong)] backdrop-blur-3xl backdrop-saturate-200 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.5)] ring-1 ring-line"
          >
            <DetailBody key={goal.id} goal={goal} startWithDeposit={startWithDeposit} onClose={onClose} onEdit={onEdit} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function DetailBody({ goal, startWithDeposit, onClose, onEdit }: { goal: Goal; startWithDeposit?: boolean; onClose: () => void; onEdit: (goal: Goal) => void }) {
  const t = useTranslations("goals");
  const format = useFormatter();
  const { money, perMonth } = useGoalHelpers();
  const color = categoryColor(goal.color);
  const [depositing, setDepositing] = useState(Boolean(startWithDeposit));
  const [step, setStep] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deposits = useGoalDeposits(goal.type === "FINANCIAL" ? goal.id : null);
  const addMilestone = useAddMilestone();
  const deleteDeposit = useDeleteDeposit();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const monthly = perMonth(goal);

  function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!step.trim()) return;
    addMilestone.mutate({ goalId: goal.id, title: step.trim() });
    setStep("");
  }

  function archive() {
    const archived = goal.status === "ARCHIVED";
    update.mutate(
      { id: goal.id, status: archived ? "ACTIVE" : "ARCHIVED" },
      { onSuccess: () => !archived && toast.success(t("toast.archived")) },
    );
    onClose();
  }

  function destroy() {
    if (!confirmDelete) return setConfirmDelete(true);
    onClose();
    remove.mutate(goal.id, { onSuccess: () => toast.success(t("toast.deleted")) });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.3 } }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Header berwarna */}
      <div className="relative shrink-0 overflow-hidden px-6 pt-6 pb-5 sm:px-8">
        <div aria-hidden className="absolute -top-28 -right-16 size-72 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
        <div className="relative flex items-start justify-between gap-3">
          <ModuleIcon icon={goalIcon(goal.icon)} color={color} size="lg" />
          <div className="flex items-center gap-2">
            <DeadlineChip goal={goal} />
            <button type="button" onClick={onClose} aria-label={t("detail.close")} className="grid size-8 place-items-center rounded-full bg-ink/6 text-ink-2 hover:bg-ink/10">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <p className="relative mt-4 text-[12px] font-semibold tracking-wide text-muted uppercase">{t(`types.${goal.type}.name`)}</p>
        <h2 className="relative text-[clamp(1.6rem,4vw,2.1rem)] leading-tight font-semibold tracking-[-0.035em] text-ink">{goal.title}</h2>
        {goal.description && <p className="relative mt-1.5 max-w-lg text-[15px] leading-relaxed text-muted">{goal.description}</p>}
        {goal.completedAt && goal.status === "COMPLETED" && (
          <p className="relative mt-2 text-[13px] font-medium text-finance">
            {t("detail.completedOn", { date: format.dateTime(new Date(goal.completedAt), { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 sm:px-8">
        {goal.type === "FINANCIAL" ? (
          <>
            <div className="flex flex-col items-center gap-6 rounded-[24px] bg-ink/3 p-5 sm:flex-row">
              <LiquidProgress value={goal.progress * 100} size={168} color={color} />
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[13px] font-medium text-muted">{t("card.saved")}</p>
                <AnimatedNumber value={goal.saved} format={money} className="block text-[32px] leading-tight font-semibold tracking-[-0.04em] text-ink" />
                <p className="text-[14px] text-muted">
                  {t("card.of")} {money(goal.targetAmount ?? 0)}
                </p>
                {goal.targetAmount && goal.saved < goal.targetAmount && (
                  <p className="mt-2 text-[13px] font-medium text-ink-2">{t("card.remaining", { amount: money(goal.targetAmount - goal.saved) })}</p>
                )}
                {monthly && <p className="mt-1 text-[13px] text-muted">{t("card.perMonth", { amount: money(Math.ceil(monthly)) })}</p>}
              </div>
            </div>

            <div className="mt-4">
              <AnimatePresence mode="wait" initial={false}>
                {depositing ? (
                  <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
                    <DepositForm goal={goal} onDone={() => setDepositing(false)} />
                  </motion.div>
                ) : (
                  goal.status !== "ARCHIVED" && (
                    <motion.button
                      key="button"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setDepositing(true)}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
                      style={{ background: color }}
                    >
                      <PiggyBank className="size-5" />
                      {t("deposit.title")}
                    </motion.button>
                  )
                )}
              </AnimatePresence>
            </div>

            <h3 className="mt-7 mb-2 text-[14px] font-semibold text-ink-2">{t("detail.deposits")}</h3>
            {deposits.data?.length ? (
              <ul className="overflow-hidden rounded-[20px] ring-1 ring-line">
                <AnimatePresence initial={false}>
                  {deposits.data.map((d) => (
                    <motion.li
                      key={d.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                        <PiggyBank className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{d.note || goal.title}</p>
                        <p className="flex items-center gap-1.5 text-[12px] text-muted">
                          {format.dateTime(dayDate(d.date), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                          {d.transactionId && (
                            <span className="flex items-center gap-0.5">
                              · <Link2 className="size-3" /> {t("detail.linked")}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-[14px] font-semibold text-ink tabular-nums">+{money(d.amount)}</span>
                      <button
                        type="button"
                        onClick={() => deleteDeposit.mutate({ goalId: goal.id, depositId: d.id })}
                        aria-label={t("detail.deleteDeposit")}
                        className="grid size-8 place-items-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-calendar/10 hover:text-calendar focus-visible:opacity-100 max-sm:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <p className="rounded-[20px] border border-dashed border-line-strong px-4 py-6 text-center text-[14px] text-muted">{t("detail.noDeposits")}</p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-[20px] bg-ink/3 p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[14px] font-medium text-ink-2">
                  {t("card.steps", { done: goal.milestones.filter((m) => m.done).length, total: goal.milestones.length })}
                </span>
                <span className="text-[28px] font-semibold tracking-[-0.04em] text-ink tabular-nums">{Math.round(goal.progress * 100)}%</span>
              </div>
              <GoalBar value={goal.progress} color={color} className="h-3" />
            </div>
            <h3 className="mt-6 mb-2 text-[14px] font-semibold text-ink-2">{t("detail.milestones")}</h3>
            <MilestoneList goal={goal} editable />
            <form onSubmit={addStep} className="mt-2 flex h-11 items-center gap-3 rounded-[14px] bg-ink/4 px-3 focus-within:ring-2 focus-within:ring-accent/50">
              <Plus className="size-4 text-muted" />
              <input
                value={step}
                maxLength={200}
                onChange={(e) => setStep(e.target.value)}
                placeholder={t("detail.addStep")}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
              />
            </form>
          </>
        )}

        {/* Aksi */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
          <button type="button" onClick={() => onEdit(goal)} className="flex h-10 items-center gap-1.5 rounded-full bg-ink/5 px-4 text-[13px] font-medium text-ink hover:bg-ink/8">
            <Pencil className="size-4" />
            {t("detail.edit")}
          </button>
          <button type="button" onClick={archive} className="flex h-10 items-center gap-1.5 rounded-full bg-ink/5 px-4 text-[13px] font-medium text-ink hover:bg-ink/8">
            {goal.status === "ARCHIVED" ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {goal.status === "ARCHIVED" ? t("detail.unarchive") : t("detail.archive")}
          </button>
          <motion.button
            type="button"
            layout
            onClick={destroy}
            className={cn(
              "ml-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors",
              confirmDelete ? "bg-calendar text-white" : "bg-calendar/10 text-calendar hover:bg-calendar/15",
            )}
          >
            <Trash2 className="size-4" />
            {confirmDelete ? t("detail.confirmDelete") : t("detail.delete")}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
