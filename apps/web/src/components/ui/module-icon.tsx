import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Ikon modul: ubin kaca pastel bernuansa warna modul, ikon berwarna penuh (gaya "frosted"). */
export function ModuleIcon({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = { sm: "size-7 rounded-[8px]", md: "size-9 rounded-[10px]", lg: "size-12 rounded-[14px]" }[size];
  const glyph = { sm: "size-4", md: "size-[18px]", lg: "size-6" }[size];
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center", box, className)}
      style={{
        color,
        background: `linear-gradient(160deg, color-mix(in srgb, ${color} 26%, transparent), color-mix(in srgb, ${color} 12%, transparent))`,
        boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.45), inset 0 0 0 1px color-mix(in srgb, ${color} 22%, transparent), 0 6px 14px -8px color-mix(in srgb, ${color} 55%, transparent)`,
      }}
    >
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}
