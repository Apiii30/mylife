"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/ui/input";
import { FormError, GoogleButton, SubmitButton } from "./form-parts";
import { PasswordField } from "./password-field";

/** Hanya izinkan redirect ke path internal agar tidak bisa dipakai untuk open-redirect. */
export function safeCallback(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallback(params.get("callbackUrl"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? t("errors.OAUTH") : null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });

    if (res?.error) {
      const code = res.code && t.has(`errors.${res.code}` as never) ? res.code : "UNKNOWN";
      setError(t(`errors.${code}` as "errors.UNKNOWN"));
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-center text-[24px] font-semibold tracking-[-0.03em] text-ink">{t("loginTitle")}</h1>
      <p className="mt-1 text-center text-[14px] text-muted">{t("loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <FormError message={error} />
        <Field name="email" type="email" label={t("email")} autoComplete="email" required />
        <PasswordField name="password" label={t("password")} autoComplete="current-password" required />
        <div className="mt-2">
          <SubmitButton pending={pending}>{t("submitLogin")}</SubmitButton>
        </div>
      </form>

      {googleEnabled && <GoogleButton callbackUrl={callbackUrl} />}
    </div>
  );
}
