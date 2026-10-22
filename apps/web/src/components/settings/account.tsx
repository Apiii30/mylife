"use client";

import { Download, LoaderCircle, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { useMe } from "@/lib/queries/user";
import { Row, Section } from "./settings-view";

/** 0–4: panjang, huruf besar-kecil, angka, simbol. */
function strength(password: string) {
  if (!password) return 0;
  let score = password.length >= 8 ? 1 : 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
}
const STRENGTH_COLORS = ["var(--line-strong)", "var(--c-calendar)", "var(--c-journal)", "var(--c-yellow)", "var(--c-finance)"];

export function SecuritySection() {
  const t = useTranslations("settings.security");
  const { call } = useApi();
  const { data: me } = useMe();
  const hasPassword = me?.hasPassword ?? true;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const score = strength(next);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError(t("tooShort"));
    if (next !== confirm) return setError(t("mismatch"));
    setSaving(true);
    try {
      await call("/users/me/password", { method: "POST", body: { ...(hasPassword && { current }), next } });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success(t("saved"));
    } catch (err) {
      setError(err instanceof ApiError && err.code === "WRONG_PASSWORD" ? t("wrong") : err instanceof ApiError && err.status === 429 ? t("tooMany") : t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section id="security" title={t("title")} description={hasPassword ? t("description") : t("descriptionNoPassword")}>
      <form onSubmit={submit} className="grid gap-3 sm:max-w-md">
        {hasPassword && <PasswordField label={t("current")} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />}
        <PasswordField label={t("new")} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <div className="flex gap-1 px-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <motion.span key={i} className="h-1 flex-1 rounded-full" animate={{ backgroundColor: score >= i ? STRENGTH_COLORS[score] : "var(--line-strong)" }} />
          ))}
        </div>
        <PasswordField label={t("confirm")} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" error={error ?? undefined} />
        <Button type="submit" disabled={saving || !next || !confirm || (hasPassword && !current)} className="mt-1 w-fit">
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : hasPassword ? t("change") : t("set")}
        </Button>
      </form>
    </Section>
  );
}

export function AccountSection() {
  const t = useTranslations("settings.data");
  const { data: session } = useSession();
  const { data: me } = useMe();
  const { call } = useApi();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      const data = await call<unknown>("/users/me/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = Object.assign(document.createElement("a"), { href: url, download: `mylife-${new Date().toISOString().slice(0, 10)}.json` });
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t("exported"));
    } catch {
      toast.error(t("error"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Section id="data" title={t("title")} description={t("description")}>
        <Row label={t("export")} hint={t("exportHint")}>
          <Button variant="ghost" className="glass-card" onClick={exportData} disabled={exporting}>
            {exporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t("exportButton")}
          </Button>
        </Row>
        <Row label={t("delete")} hint={t("deleteHint")}>
          <Button onClick={() => setDeleteOpen(true)} style={{ background: "var(--c-calendar)" }}>
            <Trash2 className="size-4" />
            {t("deleteButton")}
          </Button>
        </Row>
      </Section>
      <DeleteAccountDialog open={deleteOpen} email={me?.email ?? session?.user?.email ?? ""} onClose={() => setDeleteOpen(false)} call={call} />
    </>
  );
}

function DeleteAccountDialog({ open, email, onClose, call }: { open: boolean; email: string; onClose: () => void; call: ReturnType<typeof useApi>["call"] }) {
  const t = useTranslations("settings.data");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function confirmDelete() {
    if (!matches) return;
    setDeleting(true);
    try {
      await call("/users/me", { method: "DELETE", body: { email: typed.trim() } });
      await signOut({ redirectTo: "/" });
    } catch {
      toast.error(t("error"));
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t("confirmTitle")}>
      <p className="text-[14px] leading-relaxed text-ink-2">{t("confirmBody")}</p>
      <p className="mt-3 text-[13px] text-muted">{t.rich("confirmType", { email: () => <strong className="font-semibold text-ink">{email}</strong> })}</p>
      <Field label={t("emailLabel")} value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-3" autoComplete="off" />
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {t("cancel")}
        </Button>
        <Button onClick={confirmDelete} disabled={!matches || deleting} className="flex-1" style={{ background: "var(--c-calendar)" }}>
          {deleting ? <LoaderCircle className="size-4 animate-spin" /> : t("deleteForever")}
        </Button>
      </div>
    </Dialog>
  );
}
