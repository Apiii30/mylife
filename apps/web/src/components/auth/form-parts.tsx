"use client";

import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FormError({ message }: { message?: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.96 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <p role="alert" className="rounded-2xl bg-calendar/10 px-4 py-3 text-[13px] font-medium text-calendar">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={pending ? "loading" : "idle"}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : children}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

export function GoogleButton({ callbackUrl }: { callbackUrl: string }) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);

  return (
    <>
      <div className="my-5 flex items-center gap-3 text-[12px] text-subtle">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        variant="glass"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setPending(true);
          signIn("google", { redirectTo: callbackUrl });
        }}
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <GoogleGlyph />}
        {t("google")}
      </Button>
    </>
  );
}
