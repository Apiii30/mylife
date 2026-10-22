"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/dashboard/avatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useApi } from "@/hooks/use-api";
import { uploadToCloudinary, type Signed } from "@/hooks/use-photo-uploader";
import type { ApiUser } from "@/lib/api";
import { useMe, setMeCache, useUpdateMe } from "@/lib/queries/user";
import { Section } from "./settings-view";

const AVATAR_MAX = 5 * 1024 * 1024;

export function ProfileSection() {
  const t = useTranslations("settings.profile");
  const format = useFormatter();
  const { data: session, update: updateSession } = useSession();
  const { data: me } = useMe();
  const { call } = useApi();
  const client = useQueryClient();
  const updateMe = useUpdateMe();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const currentName = me?.name ?? session?.user?.name ?? "";
  const image = me?.image ?? session?.user?.image ?? null;
  const draft = name ?? currentName;
  const dirty = draft.trim() !== currentName && draft.trim().length >= 2;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    try {
      const user = await updateMe.mutateAsync({ name: draft.trim() });
      await updateSession({ user: { name: user.name } });
      setName(null);
      toast.success(t("saved"));
    } catch {
      toast.error(t("error"));
    }
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) return toast.error(t("avatarType"));
    if (file.size > AVATAR_MAX) return toast.error(t("avatarSize"));
    setProgress(0);
    try {
      const signed = await call<{ endpoint: string; apiKey: string; uploads: Signed[] }>("/photos/sign", { method: "POST", body: { count: 1 } });
      const res = await uploadToCloudinary(signed.endpoint, signed.apiKey, signed.uploads[0], file, setProgress);
      const { user } = await call<{ user: ApiUser }>("/users/me/avatar", {
        method: "POST",
        body: { publicId: res.public_id, version: res.version, signature: res.signature, format: res.format },
      });
      setMeCache(client, user);
      await updateSession({ user: { image: user.image } });
      toast.success(t("avatarSaved"));
    } catch {
      toast.error(t("error"));
    } finally {
      setProgress(null);
    }
  }

  async function removeAvatar() {
    try {
      const { user } = await call<{ user: ApiUser }>("/users/me/avatar", { method: "DELETE" });
      setMeCache(client, user);
      await updateSession({ user: { image: null } });
      toast.success(t("avatarRemoved"));
    } catch {
      toast.error(t("error"));
    }
  }

  return (
    <Section id="profile" title={t("title")} description={t("description")}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={progress !== null}
            aria-label={t("changeAvatar")}
            className="group relative block rounded-full"
          >
            <Avatar name={currentName} image={image} className="size-24 text-[28px] ring-4" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <Camera className="size-6" />
            </span>
            <AnimatePresence>
              {progress !== null && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center rounded-full bg-black/45 backdrop-blur-[2px]"
                >
                  <ProgressRing value={progress} size={56} stroke={5} color="#fff">
                    <span className="text-[11px] font-semibold text-white tabular-nums">{Math.round(progress * 100)}%</span>
                  </ProgressRing>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadAvatar(file);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted">{t("avatarHint")}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="glass-card" onClick={() => fileInput.current?.click()} disabled={progress !== null}>
              {progress !== null ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {t("upload")}
            </Button>
            {image && (
              <Button size="sm" variant="ghost" onClick={removeAvatar} className="text-calendar hover:bg-calendar/10 hover:text-calendar">
                <Trash2 className="size-4" />
                {t("remove")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={saveName} className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field label={t("name")} value={draft} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <Field label={t("email")} value={me?.email ?? session?.user?.email ?? ""} readOnly hint={t("emailHint")} />
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <p className="text-[12px] text-muted">{me && t("memberSince", { date: format.dateTime(new Date(me.createdAt), { month: "long", year: "numeric" }) })}</p>
          <AnimatePresence>
            {dirty && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Button type="submit" size="sm" disabled={updateMe.isPending}>
                  {updateMe.isPending ? <LoaderCircle className="size-4 animate-spin" /> : t("save")}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>
    </Section>
  );
}
