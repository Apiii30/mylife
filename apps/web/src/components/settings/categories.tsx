"use client";

import { Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/finance/category-icon";
import { Popover } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { CATEGORY_COLORS, CATEGORY_ICONS, categoryColor } from "@/config/categories";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory, type Category } from "@/lib/queries/finance";
import { Section } from "./settings-view";

type Kind = "EXPENSE" | "INCOME" | "TASK";

export function CategoriesSection() {
  const t = useTranslations("settings.categories");
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const { data: categories = [], isLoading } = useCategories(kind);
  const create = useCreateCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("blue");

  const onError = (error: unknown) => toast.error(error instanceof ApiError && error.status === 409 ? t("duplicate") : t("error"));

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), kind, color, icon: kind === "TASK" ? "tag" : kind === "INCOME" ? "wallet" : "tag" },
      { onSuccess: () => setName(""), onError },
    );
  }

  return (
    <Section id="categories" title={t("title")} description={t("description")}>
      <div className="mb-4 max-w-sm">
        <Segmented
          layoutId="settings-cat-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: "EXPENSE", label: t("EXPENSE") },
            { value: "INCOME", label: t("INCOME") },
            { value: "TASK", label: t("TASK") },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={kind}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="grid gap-1 sm:grid-cols-2"
        >
          {isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="h-14 animate-pulse rounded-2xl bg-ink/4" />)}
          <AnimatePresence initial={false}>
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} onError={onError} />
            ))}
          </AnimatePresence>
        </motion.ul>
      </AnimatePresence>

      <form onSubmit={add} className="mt-4 flex items-center gap-2 rounded-2xl bg-ink/3 p-2">
        <ColorPicker value={color} onChange={setColor} />
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addPlaceholder")}
          aria-label={t("addPlaceholder")}
          className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[14px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="flex h-9 items-center gap-1 rounded-full bg-ink px-4 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {t("add")}
        </button>
      </form>
    </Section>
  );
}

function CategoryRow({ category, onError }: { category: Category; onError: (e: unknown) => void }) {
  const t = useTranslations("settings.categories");
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const [name, setName] = useState(category.name);
  const [confirm, setConfirm] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const closeIcons = useCallback(() => setIconOpen(false), []);

  function rename() {
    const next = name.trim();
    if (!next || next === category.name) return setName(category.name);
    update.mutate({ id: category.id, name: next }, { onError: (e) => (setName(category.name), onError(e)) });
  }

  return (
    <motion.li layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-ink/3">
      <Popover
        open={iconOpen}
        onClose={closeIcons}
        align="start"
        className="w-64 p-3"
        trigger={
          <button type="button" onClick={() => setIconOpen((o) => !o)} aria-label={t("changeIcon")} className="rounded-[10px] transition-transform active:scale-95">
            <CategoryIcon icon={category.icon} color={category.color} />
          </button>
        }
      >
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("color")}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => update.mutate({ id: category.id, color: c }, { onError })}
              className={cn("size-6 rounded-full transition-transform hover:scale-110", category.color === c && "ring-2 ring-ink ring-offset-2 ring-offset-[var(--glass-bg-strong)]")}
              style={{ background: categoryColor(c) }}
            />
          ))}
        </div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("icon")}</p>
        <div className="grid grid-cols-6 gap-1">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              onClick={() => {
                update.mutate({ id: category.id, icon: key }, { onError });
                closeIcons();
              }}
              className={cn("grid aspect-square place-items-center rounded-lg transition-colors", category.icon === key ? "bg-ink text-canvas" : "text-ink-2 hover:bg-ink/6")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </Popover>
      <input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onBlur={rename}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        aria-label={t("name")}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-[14px] font-medium text-ink outline-none focus:bg-ink/4"
      />
      <motion.button
        type="button"
        layout
        onClick={() => (confirm ? remove.mutate(category.id, { onError }) : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={t("delete")}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium transition-all",
          confirm ? "bg-calendar text-white" : "text-subtle opacity-0 group-hover:opacity-100 hover:text-calendar focus-visible:opacity-100 max-sm:opacity-100",
        )}
      >
        <Trash2 className="size-3.5" />
        {confirm && t("confirmDelete")}
      </motion.button>
    </motion.li>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Popover
      open={open}
      onClose={close}
      align="start"
      className="flex w-auto flex-wrap gap-2 p-3"
      trigger={
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label={value} className="grid size-10 place-items-center rounded-xl bg-surface">
          <span className="size-5 rounded-full" style={{ background: categoryColor(value) }} />
        </button>
      }
    >
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => {
            onChange(c);
            close();
          }}
          className={cn("size-6 rounded-full transition-transform hover:scale-110", value === c && "ring-2 ring-ink ring-offset-2 ring-offset-[var(--glass-bg-strong)]")}
          style={{ background: categoryColor(c) }}
        />
      ))}
    </Popover>
  );
}
