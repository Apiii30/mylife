"use client";

import { Check, Repeat, Target } from "lucide-react";
import { useCalendarFormat } from "@/hooks/use-calendar-format";
import type { Occurrence } from "@/lib/calendar";
import { cn } from "@/lib/cn";

/** Warna teks yang tetap terbaca di atas latar ber-tint, di tema terang maupun gelap. */
export const tintText = (color: string) => `color-mix(in srgb, ${color} 62%, var(--ink))`;
export const tintBg = (color: string, amount = 16) => `color-mix(in srgb, ${color} ${amount}%, var(--surface))`;

export const isSpanning = (occ: Occurrence) => occ.allDay || occ.startKey !== occ.endKey;

/** Penanda tugas: lingkaran kecil, terisi centang saat selesai. */
export function TaskMark({ occ, className }: { occ: Occurrence; className?: string }) {
  return (
    <span
      className={cn("grid size-3 shrink-0 place-items-center rounded-full border-[1.5px]", className)}
      style={{ borderColor: occ.color, background: occ.done ? occ.color : undefined }}
    >
      {occ.done && <Check className="size-2 text-white" strokeWidth={4} />}
    </span>
  );
}

type ChipBodyProps = {
  occ: Occurrence;
  clippedStart?: boolean;
  clippedEnd?: boolean;
  className?: string;
};

/** Isi satu "chip" acara di grid bulan & baris seharian. */
export function ChipBody({ occ, clippedStart, clippedEnd, className }: ChipBodyProps) {
  const { time } = useCalendarFormat();
  const filled = isSpanning(occ) || occ.kind === "goal";
  const done = occ.done;

  if (filled)
    return (
      <span
        className={cn(
          "flex h-full w-full items-center gap-1 overflow-hidden rounded-[6px] px-1.5 text-[11.5px] leading-none font-medium",
          clippedStart && "rounded-l-none",
          clippedEnd && "rounded-r-none",
          done && "opacity-55",
          className,
        )}
        style={{ background: tintBg(occ.color, occ.kind === "goal" ? 22 : 16), color: tintText(occ.color) }}
      >
        {occ.kind === "goal" && <Target className="size-3 shrink-0" strokeWidth={2.5} />}
        {occ.kind === "task" && <TaskMark occ={occ} />}
        <span className={cn("truncate", done && "line-through")}>{occ.title}</span>
        {occ.repeat && occ.repeat !== "NONE" && <Repeat className="ml-auto size-2.5 shrink-0 opacity-70" />}
      </span>
    );

  return (
    <span className={cn("flex h-full w-full items-center gap-1.5 overflow-hidden rounded-[6px] px-1.5 text-[11.5px] leading-none", className)}>
      {occ.kind === "task" ? <TaskMark occ={occ} /> : <span className="size-1.5 shrink-0 rounded-full" style={{ background: occ.color }} />}
      {/* Jam hanya muncul saat grid cukup lebar (container query di baris minggu) */}
      <span className="hidden shrink-0 text-muted tabular-nums @min-[52rem]:inline">{time(occ.start)}</span>
      <span className={cn("truncate font-medium text-ink", done && "text-muted line-through")}>{occ.title}</span>
    </span>
  );
}
