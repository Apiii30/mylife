"use client";

import { motion } from "motion/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { Field } from "@/components/ui/input";
import { api, ApiError, type AuthResponse } from "@/lib/api";
import { FormError, GoogleButton, SubmitButton } from "./form-parts";
import { PasswordField } from "./password-field";

type Errors = Partial<Record<"name" | "email" | "password", string>>;

/** 0–4: panjang, huruf besar-kecil, angka, simbol. */
function passwordScore(pw: string) {
  if (!pw) return 0;
  let score = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const SCORE_COLORS = ["var(--line-strong)", "var(--c-calendar)", "var(--c-journal)", "var(--c-yellow)", "var(--c-finance)"];

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [password, setPassword] = useState("");
  const score = passwordScore(password);

  const schema = z.object({
    name: z.string().trim().min(2, t("errors.nameMin")),
    email: z.email(t("errors.emailInvalid")),
    password: z.string().min(8, t("errors.passwordMin")),
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      const errors: Errors = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as keyof Errors] ??= issue.message;
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setPending(true);

    try {
      await api<AuthResponse>("/auth/register", { method: "POST", body: { ...parsed.data, locale } });
      const res = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (res?.error) throw new ApiError(401, res.code ?? "UNKNOWN");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const code = err instanceof ApiError && t.has(`errors.${err.code}` as never) ? err.code : "UNKNOWN";
      setError(t(`errors.${code}` as "errors.UNKNOWN"));
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-center text-[24px] font-semibold tracking-[-0.03em] text-ink">{t("registerTitle")}</h1>
      <p className="mt-1 text-center text-[14px] text-muted">{t("registerSubtitle")}</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3">
        <FormError message={error} />
        <Field name="name" label={t("name")} autoComplete="name" error={fieldErrors.name} />
        <Field name="email" type="email" label={t("email")} autoComplete="email" error={fieldErrors.email} />
        <div>
          <PasswordField
            name="password"
            label={t("password")}
            autoComplete="new-password"
            error={fieldErrors.password}
            hint={fieldErrors.password ? undefined : t("passwordHint")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 flex gap-1.5 px-4" aria-hidden>
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/6">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: score >= step ? "100%" : "0%", backgroundColor: SCORE_COLORS[score] }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2">
          <SubmitButton pending={pending}>{t("submitRegister")}</SubmitButton>
        </div>
      </form>

      {googleEnabled && <GoogleButton callbackUrl="/dashboard" />}
    </div>
  );
}
