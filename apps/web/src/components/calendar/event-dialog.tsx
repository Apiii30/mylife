"use client";

import { AlignLeft, LoaderCircle, MapPin, Repeat, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_COLORS, categoryColor } from "@/config/categories";
import { dayDiff, type CalEvent, type EventRepeat } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/month";
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "@/lib/queries/events";
import { localDateKey, localTimeKey } from "@/lib/task-dates";

const COLORS = CATEGORY_COLORS.filter((c) => c !== "gray");
const REPEATS: EventRepeat[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const EASE = [0.16, 1, 0.3, 1] as const;

export type EventDefaults = { date: string; minutes?: number; allDay?: boolean };

type EventDialogProps = {
  open: boolean;
  onClose: () => void;
  event?: CalEvent | null;
  defaults?: EventDefaults;
};

export function EventDialog({ open, onClose, event, defaults }: EventDialogProps) {
  const t = useTranslations("calendar");
  return (
    <Dialog open={open} onClose={onClose} title={event ? t("editEvent") : t("newEvent")}>
      <EventForm key={event?.id ?? `new-${defaults?.date}-${defaults?.minutes}`} event={event} defaults={defaults} onDone={onClose} />
    </Dialog>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
/** Menit absolut sejak tanggal acuan — memudahkan menjaga durasi saat waktu mulai digeser. */
const absolute = (date: string, time: string, ref: string) => dayDiff(ref, date) * 1440 + toMinutes(time);

function initialState(event?: CalEvent | null, defaults?: EventDefaults) {
  if (event?.allDay) return { startDate: event.start, startTime: "09:00", endDate: event.end, endTime: "10:00" };
  if (event) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    return { startDate: localDateKey(start), startTime: localTimeKey(start), endDate: localDateKey(end), endTime: localTimeKey(end) };
  }
  const date = defaults?.date ?? localDateKey(new Date());
  const minutes = Math.min(defaults?.minutes ?? 9 * 60, 23 * 60);
  return { startDate: date, startTime: toTime(minutes), endDate: date, endTime: toTime(minutes + 60) };
}

function EventForm({ event, defaults, onDone }: { event?: CalEvent | null; defaults?: EventDefaults; onDone: () => void }) {
  const t = useTranslations("calendar");
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();

  const init = initialState(event, defaults);
  const [title, setTitle] = useState(event?.title ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? defaults?.allDay ?? false);
  const [startDate, setStartDate] = useState(init.startDate);
  const [startTime, setStartTime] = useState(init.startTime);
  const [endDate, setEndDate] = useState(init.endDate);
  const [endTime, setEndTime] = useState(init.endTime);
  const [repeat, setRepeat] = useState<EventRepeat>(event?.repeat ?? "NONE");
  const [color, setColor] = useState(event?.color ?? "blue");
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = create.isPending || update.isPending;
  const tint = categoryColor(color);

  // Menggeser waktu mulai ikut menggeser waktu selesai (durasi tetap), seperti di Apple Calendar
  function changeStart(date: string, time: string) {
    if (!date) return;
    const duration = allDay ? dayDiff(startDate, endDate) * 1440 : absolute(endDate, endTime, startDate) - absolute(startDate, startTime, startDate);
    const end = absolute(date, time, date) + Math.max(0, duration);
    setStartDate(date);
    setStartTime(time);
    setEndDate(addDays(date, Math.floor(end / 1440)));
    if (!allDay) setEndTime(toTime(end % 1440));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError(t("form.titleRequired"));
    const start = allDay ? startDate : new Date(`${startDate}T${startTime}:00`).toISOString();
    const end = allDay ? endDate : new Date(`${endDate}T${endTime}:00`).toISOString();
    if (allDay ? endDate < startDate : new Date(end) < new Date(start)) return setError(t("form.endBeforeStart"));

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      allDay,
      start,
      end,
      repeat,
      color,
    };
    try {
      if (event) await update.mutateAsync({ id: event.id, ...body });
      else await create.mutateAsync(body);
      toast.success(event ? t("toast.updated") : t("toast.created"));
      onDone();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  function onDelete() {
    if (!event) return;
    if (!confirmDelete) return setConfirmDelete(true);
    onDone();
    remove.mutate(event.id, { onSuccess: () => toast.success(t("toast.deleted")) });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <motion.span
          key={color}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="h-8 w-1.5 shrink-0 rounded-full"
          style={{ background: tint }}
        />
        <input
          autoFocus
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
          placeholder={t("form.title")}
          aria-label={t("form.title")}
          className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-ink/25"
        />
      </div>

      {/* Waktu */}
      <div className="overflow-hidden rounded-[20px] bg-ink/4">
        <Switch checked={allDay} onChange={setAllDay} label={t("form.allDay")} color={tint} className="rounded-none bg-transparent" />
        <div className="mx-4 h-px bg-line" />
        <TimeRow
          label={t("form.start")}
          date={startDate}
          time={startTime}
          allDay={allDay}
          onDate={(d) => changeStart(d, startTime)}
          onTime={(time) => changeStart(startDate, time)}
        />
        <div className="mx-4 h-px bg-line" />
        <TimeRow
          label={t("form.end")}
          date={endDate}
          time={endTime}
          allDay={allDay}
          min={startDate}
          onDate={(d) => {
            setEndDate(d);
            setError(null);
          }}
          onTime={(time) => {
            setEndTime(time);
            setError(null);
          }}
        />
      </div>

      {/* Pengulangan */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-medium text-muted">
          <Repeat className="size-3.5" />
          {t("form.repeat")}
        </p>
        <div className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1">
          {REPEATS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRepeat(r)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-[13px] font-medium transition-colors",
                repeat === r ? "text-white" : "bg-ink/5 text-ink-2 hover:bg-ink/8",
              )}
              style={repeat === r ? { background: tint } : undefined}
            >
              {t(`repeatShort.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Warna */}
      <div>
        <p className="mb-2 px-1 text-[12px] font-medium text-muted">{t("form.color")}</p>
        <div className="flex flex-wrap gap-2.5">
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

      <div className="flex h-12 items-center gap-3 rounded-[16px] bg-ink/4 px-4 focus-within:ring-2 focus-within:ring-accent/60">
        <MapPin className="size-4 shrink-0 text-muted" />
        <input
          value={location}
          maxLength={200}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("form.location")}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      <div className="flex gap-3 rounded-[16px] bg-ink/4 px-4 py-3 focus-within:ring-2 focus-within:ring-accent/60">
        <AlignLeft className="mt-0.5 size-4 shrink-0 text-muted" />
        <textarea
          value={description}
          maxLength={2000}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form.description")}
          className="min-w-0 flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted"
          style={{ fieldSizing: "content", minHeight: 48 } as React.CSSProperties}
        />
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="text-center text-[13px] font-medium text-calendar"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-2 pt-1">
        {event && (
          <motion.button
            type="button"
            layout
            onClick={onDelete}
            className={cn(
              "flex h-13 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition-colors",
              confirmDelete ? "bg-calendar text-white" : "bg-calendar/10 text-calendar hover:bg-calendar/15",
            )}
          >
            <Trash2 className="size-4" />
            <AnimatePresence mode="popLayout" initial={false}>
              {confirmDelete && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {event.repeat === "NONE" ? t("form.confirmDelete") : t("form.confirmDeleteSeries")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        <Button type="submit" size="lg" disabled={pending} className="flex-1" style={{ background: tint }}>
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : event ? t("form.save") : t("form.create")}
        </Button>
      </div>
    </form>
  );
}

function TimeRow({
  label,
  date,
  time,
  allDay,
  min,
  onDate,
  onTime,
}: {
  label: string;
  date: string;
  time: string;
  allDay: boolean;
  min?: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="flex-1 text-[13px] font-medium text-ink-2">{label}</span>
      <input
        type="date"
        value={date}
        min={min}
        onChange={(e) => e.target.value && onDate(e.target.value)}
        aria-label={label}
        className="h-9 rounded-[10px] bg-ink/5 px-2.5 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent/60"
      />
      <AnimatePresence initial={false}>
        {!allDay && (
          <motion.input
            type="time"
            value={time}
            onChange={(e) => e.target.value && onTime(e.target.value)}
            aria-label={`${label} ⋅ time`}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="h-9 rounded-[10px] bg-ink/5 px-2.5 text-[14px] text-ink tabular-nums outline-none focus:ring-2 focus:ring-accent/60"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
