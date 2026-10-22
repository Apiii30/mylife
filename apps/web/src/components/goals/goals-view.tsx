"use client";

import { Plus, Target } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";
import { StatTile } from "@/components/finance/stat-tile";
import { Button } from "@/components/ui/button";
import { ModuleIcon } from "@/components/ui/module-icon";
import { useMounted } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/queries/finance";
import { useGoals, type Goal, type GoalStatus } from "@/lib/queries/goals";
import { GoalCard } from "./goal-card";
import { GoalDetail } from "./goal-detail";
import { GoalFormDialog } from "./goal-form-dialog";

const TABS: { key: GoalStatus; label: "active" | "completed" | "archived" }[] = [
  { key: "ACTIVE", label: "active" },
  { key: "COMPLETED", label: "completed" },
  { key: "ARCHIVED", label: "archived" },
];

export function GoalsView({ initialGoalId }: { initialGoalId?: string }) {
  const t = useTranslations("goals");
  const { money } = useMoney();
  const mounted = useMounted();
  const { data: goals, isLoading } = useGoals();
  const [tab, setTab] = useState<GoalStatus>("ACTIVE");
  const [openId, setOpenId] = useState<string | null>(initialGoalId ?? null);
  const [depositFirst, setDepositFirst] = useState(false);
  const [form, setForm] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });

  const all = goals ?? [];
  const visible = all.filter((g) => g.status === tab);
  const active = all.filter((g) => g.status === "ACTIVE");
  const completed = all.filter((g) => g.status === "COMPLETED");
  const totalSaved = all.filter((g) => g.type === "FINANCIAL").reduce((sum, g) => sum + g.saved, 0);
  const openGoal = all.find((g) => g.id === openId) ?? null;

  function open(goal: Goal, deposit = false) {
    setDepositFirst(deposit);
    setOpenId(goal.id);
    window.history.replaceState(null, "", `?goal=${goal.id}`);
  }
  function close() {
    setOpenId(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <LayoutGroup>
      <header className="flex flex-col gap-5 pt-2 pb-6 sm:pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <ModuleIcon icon={Target} color="var(--c-goals)" size="lg" />
          <div>
            <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] text-ink">{t("title")}</h1>
            <p className="text-[14px] text-muted">{t("summary", { active: active.length, completed: completed.length })}</p>
          </div>
        </div>
        <Button onClick={() => setForm({ open: true, goal: null })} className="hidden md:inline-flex">
          <Plus className="size-4" strokeWidth={2.5} />
          {t("add")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile label={t("stats.saved")} value={totalSaved} format={money} color="var(--c-goals)" index={0} className="col-span-2 sm:col-span-1" />
        <StatTile label={t("stats.active")} value={active.length} format={(n) => String(Math.round(n))} index={1} />
        <StatTile label={t("stats.completed")} value={completed.length} format={(n) => String(Math.round(n))} color="var(--c-finance)" index={2} />
      </div>

      <div className="mt-8 mb-5 inline-grid grid-cols-3 rounded-full bg-ink/5 p-1">
        {TABS.map(({ key, label }) => {
          const count = all.filter((g) => g.status === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn("relative flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium", tab === key ? "text-ink" : "text-muted hover:text-ink")}
            >
              {tab === key && (
                <motion.span layoutId="goals-tab" className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.1),0_0_0_0.5px_var(--line)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{t(`tabs.${label}`)}</span>
              {count > 0 && <span className="relative text-[11px] text-muted tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[30px] bg-ink/4" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 rounded-[30px] border border-dashed border-line-strong px-6 py-16 text-center"
        >
          <p className="text-[15px] text-muted">{t(`empty.${TABS.find((x) => x.key === tab)!.label}`)}</p>
          {tab === "ACTIVE" && (
            <Button size="sm" onClick={() => setForm({ open: true, goal: null })}>
              <Plus className="size-4" strokeWidth={2.5} />
              {t("add")}
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} onOpen={() => open(goal)} onDeposit={() => open(goal, true)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <GoalDetail goal={openGoal} startWithDeposit={depositFirst} onClose={close} onEdit={(goal) => setForm({ open: true, goal })} />
      <GoalFormDialog
        open={form.open}
        goal={form.goal}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onCreated={(goal) => setTab(goal.status)}
      />

      {mounted &&
        createPortal(
          <AnimatePresence>
            {!form.open && !openId && (
              <motion.button
                type="button"
                onClick={() => setForm({ open: true, goal: null })}
                aria-label={t("add")}
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
    </LayoutGroup>
  );
}
