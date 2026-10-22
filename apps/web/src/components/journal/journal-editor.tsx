"use client";

import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  ChevronLeft,
  CloudAlert,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  LoaderCircle,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EASE_OUT_EXPO } from "@/components/ui/reveal";
import { JOURNAL_PROMPTS, type Mood } from "@/config/moods";
import { useJournalAutosave, type SaveStatus } from "@/hooks/use-journal-autosave";
import { cn } from "@/lib/cn";
import { dayDate } from "@/lib/month";
import { useDeleteJournal, useJournal, type JournalEntry } from "@/lib/queries/journals";
import { localDateKey } from "@/lib/task-dates";
import { MoodPicker } from "./mood-picker";

const WORDS_PER_MINUTE = 200;

export function JournalEditor({ id, initialDate }: { id: string | null; initialDate?: string }) {
  const t = useTranslations("journal");
  const { data: entry, isLoading, isError } = useJournal(id);

  if (id && isLoading)
    return (
      <div className="mx-auto max-w-[720px] pt-10">
        <div className="h-5 w-40 animate-pulse rounded-full bg-ink/6" />
        <div className="mt-6 h-10 w-2/3 animate-pulse rounded-2xl bg-ink/6" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded-full bg-ink/5" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );

  if (id && (isError || !entry))
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-24 text-center">
        <p className="text-[15px] text-muted">{t("notFound")}</p>
        <Link href="/dashboard/journal" className="text-[14px] font-semibold text-journal">
          {t("back")}
        </Link>
      </div>
    );

  return <EditorBody entry={entry ?? null} initialDate={initialDate} />;
}

function EditorBody({ entry, initialDate }: { entry: JournalEntry | null; initialDate?: string }) {
  const t = useTranslations("journal");
  const format = useFormatter();
  const router = useRouter();
  const today = localDateKey(useNow({ updateInterval: 60_000 }));
  const remove = useDeleteJournal();
  const dateInput = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(entry?.date ?? initialDate ?? today);
  const [mood, setMood] = useState<Mood | null>(entry?.mood ?? null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const autosave = useJournalAutosave({
    id: entry?.id ?? null,
    date,
    // Entri baru: ganti URL ke /journal/{id} tanpa memuat ulang halaman
    onCreated: (id) => window.history.replaceState(null, "", `/dashboard/journal/${id}`),
  });

  const editor = useEditor({
    immediatelyRender: false,
    // Render ulang tiap transaksi agar toolbar, jumlah kata, & prompt selalu sinkron
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t("placeholder") }),
    ],
    content: entry?.content ?? "",
    editorProps: { attributes: { class: "journal-prose", "aria-label": t("placeholder") } },
    onUpdate: ({ editor }) => autosave.schedule({ content: editor.getJSON() }),
  });

  const text = editor?.getText().trim() ?? "";
  const words = text ? text.split(/\s+/).length : 0;
  const empty = editor ? editor.isEmpty : !entry?.content;

  function insertPrompt(prompt: string) {
    editor?.chain().focus().insertContent([{ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: prompt }] }, { type: "paragraph" }]).run();
  }

  async function onDelete() {
    if (!confirmDelete) return setConfirmDelete(true);
    await autosave.flush();
    const id = autosave.id.current;
    if (id) await remove.mutateAsync(id).catch(() => null);
    toast.success(t("toast.deleted"));
    router.push("/dashboard/journal");
  }

  const prompts = JOURNAL_PROMPTS.map((key) => t(`prompts.${key}`));

  return (
    <article className="mx-auto max-w-[720px] pt-2 sm:pt-4">
      {/* Navigasi & status simpan */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/journal"
          className="-ml-2 flex h-9 items-center gap-1 rounded-full pr-3 pl-1.5 text-[15px] font-medium text-journal transition-colors hover:bg-journal/10"
        >
          <ChevronLeft className="size-5" />
          {t("title")}
        </Link>
        <div className="flex items-center gap-2">
          <SaveIndicator status={autosave.status} onRetry={() => void autosave.flush()} />
          <motion.button
            type="button"
            layout
            onClick={onDelete}
            onBlur={() => setConfirmDelete(false)}
            aria-label={t("delete")}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium transition-colors",
              confirmDelete ? "bg-calendar text-white" : "text-muted hover:bg-calendar/10 hover:text-calendar",
            )}
          >
            <Trash2 className="size-4" />
            <AnimatePresence mode="popLayout" initial={false}>
              {confirmDelete && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {t("confirmDelete")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}>
        {/* Tanggal */}
        <div className="relative mt-6 inline-block">
          <button
            type="button"
            onClick={() => dateInput.current?.showPicker()}
            className={cn("text-[13px] font-semibold tracking-wide uppercase transition-colors hover:text-ink", date === today ? "text-journal" : "text-muted")}
          >
            {date === today && `${t("today")} · `}
            {format.dateTime(dayDate(date), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </button>
          <input
            ref={dateInput}
            type="date"
            value={date}
            max={today}
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              if (!e.target.value) return;
              setDate(e.target.value);
              autosave.schedule({ date: e.target.value });
            }}
            className="pointer-events-none absolute inset-0 opacity-0"
          />
        </div>

        {/* Judul */}
        <textarea
          value={title}
          maxLength={200}
          rows={1}
          onChange={(e) => {
            setTitle(e.target.value);
            autosave.schedule({ title: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus("start");
            }
          }}
          placeholder={t("titlePlaceholder")}
          aria-label={t("titlePlaceholder")}
          className="mt-2 w-full resize-none bg-transparent text-[clamp(1.8rem,4vw,2.4rem)] leading-tight font-semibold tracking-[-0.035em] text-ink outline-none placeholder:text-ink/20"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />

        <div className="mt-4">
          <MoodPicker
            value={mood}
            onChange={(next) => {
              setMood(next);
              autosave.schedule({ mood: next });
            }}
          />
        </div>
      </motion.div>

      <Toolbar editor={editor} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.15 }}
        className="relative mt-2"
        onClick={(e) => e.target === e.currentTarget && editor?.commands.focus("end")}
      >
        <EditorContent editor={editor} />

        {/* Pertanyaan pemantik saat halaman masih kosong */}
        <AnimatePresence>
          {empty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO, delay: 0.3 }}
              className="absolute inset-x-0 top-14"
            >
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Sparkles className="size-3.5 text-journal" />
                {t("promptsTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => insertPrompt(prompt)}
                    className="rounded-full bg-journal/10 px-3.5 py-2 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-journal/16 hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <footer className="mt-10 flex items-center gap-3 border-t border-line pt-4 text-[12px] text-muted tabular-nums">
        <span>{t("words", { count: words })}</span>
        <span aria-hidden>·</span>
        <span>{t("readTime", { minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)) })}</span>
      </footer>
    </article>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const t = useTranslations("journal.status");
  if (status === "idle") return null;
  const content = {
    dirty: <span className="size-1.5 rounded-full bg-subtle" />,
    saving: <LoaderCircle className="size-3.5 animate-spin" />,
    saved: <Check className="size-3.5 text-finance" strokeWidth={3} />,
    error: <CloudAlert className="size-3.5 text-calendar" />,
  }[status];

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.button
        key={status}
        type="button"
        disabled={status !== "error"}
        onClick={onRetry}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className={cn("flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium", status === "error" ? "bg-calendar/10 text-calendar" : "text-muted")}
        aria-live="polite"
      >
        {content}
        {t(status)}
      </motion.button>
    </AnimatePresence>
  );
}

type ToolbarItem = { icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; run: () => void } | "divider";

/** Toolbar kaca yang menempel di bawah header saat menggulir. */
function Toolbar({ editor }: { editor: Editor | null }) {
  const t = useTranslations("journal.format");
  if (!editor) return <div className="mt-6 h-[62px]" />;
  const chain = () => editor.chain().focus();
  const state = {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    strike: editor.isActive("strike"),
    h2: editor.isActive("heading", { level: 2 }),
    h3: editor.isActive("heading", { level: 3 }),
    bullet: editor.isActive("bulletList"),
    ordered: editor.isActive("orderedList"),
    task: editor.isActive("taskList"),
    quote: editor.isActive("blockquote"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };

  const items: ToolbarItem[] = [
    { icon: Bold, label: t("bold"), active: state.bold, run: () => chain().toggleBold().run() },
    { icon: Italic, label: t("italic"), active: state.italic, run: () => chain().toggleItalic().run() },
    { icon: Strikethrough, label: t("strike"), active: state.strike, run: () => chain().toggleStrike().run() },
    "divider",
    { icon: Heading2, label: t("h2"), active: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: t("h3"), active: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    { icon: Quote, label: t("quote"), active: state.quote, run: () => chain().toggleBlockquote().run() },
    "divider",
    { icon: List, label: t("bullet"), active: state.bullet, run: () => chain().toggleBulletList().run() },
    { icon: ListOrdered, label: t("ordered"), active: state.ordered, run: () => chain().toggleOrderedList().run() },
    { icon: ListChecks, label: t("task"), active: state.task, run: () => chain().toggleTaskList().run() },
    { icon: Minus, label: t("divider"), run: () => chain().setHorizontalRule().run() },
    "divider",
    { icon: Undo2, label: t("undo"), disabled: !state.canUndo, run: () => chain().undo().run() },
    { icon: Redo2, label: t("redo"), disabled: !state.canRedo, run: () => chain().redo().run() },
  ];

  return (
    <div className="sticky top-16 z-20 -mx-2 mt-6 py-2">
      <div
        role="toolbar"
        aria-label={t("label")}
        className="glass glass-strong flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1"
      >
        {items.map((item, i) =>
          item === "divider" ? (
            <span key={i} className="mx-1 h-5 w-px shrink-0 bg-line-strong" />
          ) : (
            <button
              key={item.label}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={item.active}
              disabled={item.disabled}
              onMouseDown={(e) => e.preventDefault()} // jangan curi fokus/seleksi dari editor
              onClick={item.run}
              className={cn(
                "relative grid size-9 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-30",
                item.active ? "text-white" : "text-ink-2 hover:bg-ink/6 hover:text-ink",
              )}
            >
              {item.active && (
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-journal"
                />
              )}
              <item.icon className="relative size-[17px]" strokeWidth={2.2} />
            </button>
          ),
        )}
      </div>
    </div>
  );
}
