import { getTranslations } from "next-intl/server";
import { Aurora } from "@/components/ui/aurora";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="relative isolate grid min-h-svh place-items-center overflow-hidden px-6 text-center">
      <Aurora intensity="soft" />
      <div className="relative">
        <p className="text-gradient-life animate-shimmer text-[clamp(6rem,20vw,11rem)] leading-none font-semibold tracking-[-0.06em]">
          404
        </p>
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em] text-ink">{t("title")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">{t("desc")}</p>
        <ButtonLink href="/" className="mt-8">
          {t("back")}
        </ButtonLink>
      </div>
    </main>
  );
}
