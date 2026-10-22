"use client";

import { motion } from "motion/react";
import { useLocale } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** State nominal sebagai string mentah ("1250000" / "12.5") + angka hasil parse. */
export function useAmount(initial?: number | null) {
  const [raw, setRaw] = useState(initial ? String(initial) : "");
  return { raw, setRaw, value: Number(raw) || 0 };
}

type AmountInputProps = {
  id?: string;
  raw: string;
  onRawChange: (raw: string) => void;
  currency: string;
  prefix?: string;
  accent?: string;
  autoFocus?: boolean;
  size?: "lg" | "md";
  className?: string;
};

/** Input nominal besar: titik ribuan otomatis saat mengetik, lebar mengikuti isinya. */
export function AmountInput({
  id,
  raw,
  onRawChange,
  currency,
  prefix = "",
  accent = "var(--ink)",
  autoFocus,
  size = "lg",
  className,
}: AmountInputProps) {
  const locale = useLocale();
  const intlLocale = locale === "id" ? "id-ID" : "en-US";
  const allowDecimal = currency !== "IDR";
  const symbol =
    new Intl.NumberFormat(intlLocale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")
      ?.value ?? currency;

  const [intPart, decPart] = raw.split(".");
  const display =
    (intPart ? new Intl.NumberFormat(intlLocale).format(Number(intPart)) : "") +
    (decPart !== undefined ? (locale === "id" ? "," : ".") + decPart : "");

  function onChange(value: string) {
    let clean = value.replace(locale === "id" ? /\./g : /,/g, "").replace(",", ".");
    clean = clean.replace(allowDecimal ? /[^\d.]/g : /\D/g, "");
    const [i = "", d] = clean.split(".");
    onRawChange(d !== undefined ? `${i.slice(0, 13)}.${d.slice(0, 2)}` : i.slice(0, 13));
  }

  const text = size === "lg" ? "text-[44px]" : "text-[32px]";

  return (
    <div className={cn("flex items-baseline justify-center gap-2", className)}>
      <motion.span animate={{ color: accent }} className={cn("font-semibold", size === "lg" ? "text-[22px]" : "text-[18px]")}>
        {prefix}
        {symbol}
      </motion.span>
      {/* Span tak terlihat menentukan lebar → input selalu selebar isinya */}
      <span className="relative inline-grid max-w-[16rem]">
        <span aria-hidden className={cn("invisible col-start-1 row-start-1 overflow-hidden leading-none font-semibold tracking-[-0.04em] whitespace-pre", text)}>
          {display || "0"}
        </span>
        <input
          id={id}
          autoFocus={autoFocus}
          inputMode={allowDecimal ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder="0"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "col-start-1 row-start-1 w-full min-w-0 bg-transparent leading-none font-semibold tracking-[-0.04em] text-ink caret-accent outline-none placeholder:text-ink/20",
            text,
          )}
        />
      </span>
    </div>
  );
}
