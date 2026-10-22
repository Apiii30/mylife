import Image from "next/image";
import { cn } from "@/lib/cn";

export function Avatar({ name, image, className }: { name?: string | null; image?: string | null; className?: string }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? ""}
        width={192}
        height={192}
        className={cn("size-9 shrink-0 rounded-full object-cover ring-2 ring-surface", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white ring-2 ring-surface",
        "bg-[conic-gradient(from_210deg,var(--c-gallery),var(--c-journal),var(--c-goals),var(--c-tasks),var(--c-gallery))]",
        className,
      )}
    >
      {initials}
    </span>
  );
}
