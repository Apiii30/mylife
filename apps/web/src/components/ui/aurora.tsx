import { cn } from "@/lib/cn";

type AuroraProps = { className?: string; intensity?: "hero" | "soft" };

/** Latar gradien cair yang terus berubah bentuk (morphing) — murni CSS agar ringan. */
export function Aurora({ className, intensity = "hero" }: AuroraProps) {
  const soft = intensity === "soft";
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity: soft ? "calc(var(--aurora-opacity) * 0.6)" : "var(--aurora-opacity)" }}
    >
      <div className="animate-aurora-1 absolute top-[-18%] left-[8%] h-[62vmax] w-[62vmax] bg-[radial-gradient(circle_at_center,var(--c-tasks),transparent_62%)] blur-3xl" />
      <div className="animate-aurora-2 absolute top-[2%] right-[-12%] h-[55vmax] w-[55vmax] bg-[radial-gradient(circle_at_center,var(--c-gallery),transparent_60%)] blur-3xl" />
      <div className="animate-aurora-3 absolute bottom-[-30%] left-[-10%] h-[58vmax] w-[58vmax] bg-[radial-gradient(circle_at_center,var(--c-finance),transparent_60%)] blur-3xl" />
      <div className="animate-aurora-2 absolute right-[18%] bottom-[-26%] h-[46vmax] w-[46vmax] bg-[radial-gradient(circle_at_center,var(--c-journal),transparent_60%)] opacity-70 blur-3xl [animation-delay:-9s]" />
      <div className="animate-aurora-1 absolute top-[20%] left-[36%] h-[40vmax] w-[40vmax] bg-[radial-gradient(circle_at_center,var(--c-goals),transparent_60%)] opacity-80 blur-3xl [animation-delay:-14s]" />
    </div>
  );
}
