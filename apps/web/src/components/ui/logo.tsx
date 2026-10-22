import { cn } from "@/lib/cn";

const PETALS = ["--c-tasks", "--c-teal", "--c-finance", "--c-journal", "--c-gallery", "--c-goals"];

/** Enam kelopak = enam ruang kehidupan. Kelopak berputar halus saat di-hover. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <g className="origin-center transition-transform duration-700 ease-out-expo group-hover/logo:rotate-60">
        {PETALS.map((color, i) => {
          const angle = (i * Math.PI * 2) / PETALS.length - Math.PI / 2;
          return (
            <circle
              key={color}
              cx={16 + Math.cos(angle) * 7}
              cy={16 + Math.sin(angle) * 7}
              r={5.6}
              fill={`var(${color})`}
              fillOpacity={0.72}
              className="mix-blend-multiply dark:mix-blend-screen"
            />
          );
        })}
      </g>
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("group/logo inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showText && <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink">MyLife</span>}
    </span>
  );
}
