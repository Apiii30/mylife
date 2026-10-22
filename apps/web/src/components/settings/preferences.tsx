"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { toast } from "sonner";
import { Segmented } from "@/components/ui/segmented";
import { useMounted } from "@/hooks/use-media-query";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { SCALE_GRADES, type GradeScale } from "@/lib/grades";
import { useMe, useUpdateMe } from "@/lib/queries/user";
import { Row, Section } from "./settings-view";

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "AUD", "GBP"] as const;

export function PreferencesSection() {
  const t = useTranslations("settings.preferences");
  const locale = useLocale();
  const router = useRouter();
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const [pending, startTransition] = useTransition();

  const save = (body: Parameters<typeof update.mutate>[0]) => update.mutate(body, { onSuccess: () => toast.success(t("saved")), onError: () => toast.error(t("error")) });

  function changeLocale(next: "id" | "en") {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      update.mutate({ locale: next });
      router.refresh();
    });
  }

  return (
    <Section id="preferences" title={t("title")} description={t("description")}>
      <Row label={t("language")} hint={t("languageHint")}>
        <div className={cn("w-56", pending && "opacity-60")}>
          <Segmented
            layoutId="pref-locale"
            value={locale as "id" | "en"}
            onChange={changeLocale}
            options={[
              { value: "id", label: "Indonesia" },
              { value: "en", label: "English" },
            ]}
          />
        </div>
      </Row>

      <Row label={t("theme")} hint={t("themeHint")}>
        <div className="w-72">
          <Segmented
            layoutId="pref-theme"
            value={(mounted ? theme : "system") as "light" | "dark" | "system"}
            onChange={setTheme}
            options={[
              { value: "light", label: <><Sun className="size-3.5" />{t("light")}</> },
              { value: "dark", label: <><Moon className="size-3.5" />{t("dark")}</> },
              { value: "system", label: <><Laptop className="size-3.5" />{t("system")}</> },
            ]}
          />
        </div>
      </Row>

      <Row label={t("currency")} hint={t("currencyHint", { example: formatMoney(1_250_000, me?.currency ?? "IDR", locale) })}>
        <div className="grid grid-cols-4 gap-1.5 sm:w-80">
          {CURRENCIES.map((code) => {
            const active = (me?.currency ?? "IDR") === code;
            return (
              <motion.button
                key={code}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => !active && save({ currency: code })}
                aria-pressed={active}
                className={cn(
                  "relative h-9 rounded-xl text-[13px] font-semibold transition-colors",
                  active ? "bg-accent text-white shadow-[0_6px_16px_-8px_var(--accent)]" : "bg-ink/5 text-ink-2 hover:bg-ink/8",
                )}
              >
                {code}
              </motion.button>
            );
          })}
        </div>
      </Row>

      <Row label={t("gradeScale")} hint={t("gradeScaleHint")}>
        <div className="grid gap-2 sm:w-80">
          {(["LETTER_AB", "PLUS_MINUS"] as GradeScale[]).map((scale) => {
            const active = (me?.gradeScale ?? "LETTER_AB") === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => !active && save({ gradeScale: scale })}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition-colors",
                  active ? "bg-accent/8 ring-accent/50" : "ring-line hover:bg-ink/3",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{t(`scale.${scale}`)}</span>
                  <span className="block truncate text-[12px] text-muted tabular-nums">{SCALE_GRADES[scale].join(" · ")}</span>
                </span>
                <span className={cn("grid size-5 place-items-center rounded-full", active ? "bg-accent text-white" : "ring-1 ring-line-strong")}>
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </Row>
    </Section>
  );
}
