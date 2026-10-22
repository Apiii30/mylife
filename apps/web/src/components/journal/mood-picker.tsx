"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { MOODS, moodOf, type Mood } from "@/config/moods";
import { cn } from "@/lib/cn";

/** Lima wajah; yang terpilih membesar dan terisi warnanya. Ketuk lagi untuk mengosongkan. */
export function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (mood: Mood | null) => void }) {
  const t = useTranslations("journal");
  const selected = moodOf(value);

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label={t("mood.label")} className="flex gap-1">
        {MOODS.map(({ key, icon: Icon, color, ink }) => {
          const active = key === value;
          return (
            <motion.button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(`mood.${key}`)}
              title={t(`mood.${key}`)}
              onClick={() => onChange(active ? null : key)}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: active ? 1.12 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={cn(
                "relative grid size-10 place-items-center rounded-full transition-colors",
                !active && "text-subtle hover:bg-ink/5 hover:text-ink-2",
              )}
              style={active ? { color: ink } : undefined}
            >
              {active && (
                <motion.span
                  layoutId="mood-fill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: color, boxShadow: `0 6px 16px -6px ${color}` }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                />
              )}
              <Icon className="relative size-[22px]" strokeWidth={2} />
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value ?? "none"}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.25 }}
          className="text-[13px] font-medium text-muted"
        >
          {selected ? t(`mood.${selected.key}`) : t("mood.prompt")}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Lencana kecil mood untuk kartu & widget (ikon + label, tidak hanya warna). */
export function MoodBadge({ mood, showLabel = true }: { mood: Mood | null; showLabel?: boolean }) {
  const t = useTranslations("journal");
  const def = moodOf(mood);
  if (!def) return null;
  const Icon = def.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-2" title={t(`mood.${def.key}`)}>
      <span className="grid size-5 place-items-center rounded-full" style={{ background: def.color, color: def.ink }}>
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      {showLabel && t(`mood.${def.key}`)}
    </span>
  );
}
