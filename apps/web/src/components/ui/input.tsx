"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

type FieldProps = React.ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: React.ReactNode;
};

/** Input dengan label mengambang ala iOS. */
export function Field({ label, error, hint, trailing, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const message = error ?? hint;

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          aria-invalid={Boolean(error)}
          aria-describedby={message ? `${inputId}-msg` : undefined}
          className={cn(
            "peer h-[58px] w-full rounded-[18px] bg-ink/4 px-4 pt-5 pb-1 text-[16px] text-ink ring-1 ring-transparent outline-none",
            "transition-[background-color,box-shadow] duration-300 ease-out-expo",
            "hover:bg-ink/6 focus:bg-surface focus:ring-2 focus:ring-accent/70",
            error && "ring-calendar/60 focus:ring-calendar/70",
            trailing && "pr-12",
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-1/2 left-4 origin-left -translate-y-1/2 text-[16px] text-muted",
            "transition-all duration-300 ease-out-expo",
            "peer-focus:top-[18px] peer-focus:scale-[0.72] peer-[:not(:placeholder-shown)]:top-[18px] peer-[:not(:placeholder-shown)]:scale-[0.72]",
          )}
        >
          {label}
        </label>
        {trailing && <div className="absolute top-1/2 right-2 -translate-y-1/2">{trailing}</div>}
      </div>
      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            id={`${inputId}-msg`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn("overflow-hidden px-4 pt-1.5 text-[12px]", error ? "text-calendar" : "text-muted")}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
