"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Aurora } from "@/components/ui/aurora";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Reveal, RevealLines } from "@/components/ui/reveal";

export function Cta({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations();

  return (
    <section className="px-3 pb-6 sm:px-4">
      <div className="relative isolate overflow-hidden rounded-[40px] glass-card px-6 py-24 text-center sm:rounded-[56px] sm:py-36">
        <Aurora />
        <div className="relative mx-auto max-w-3xl">
          <Reveal className="flex justify-center">
            <LogoMark className="size-14" />
          </Reveal>
          <h2 className="mt-8 text-[clamp(2.6rem,8vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.055em] text-ink">
            <RevealLines text={t("landing.cta.title")} />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-6 text-[clamp(1.05rem,2vw,1.25rem)] text-ink-2">{t("landing.cta.subtitle")}</p>
          </Reveal>
          <Reveal delay={0.3} className="mt-10 flex justify-center">
            <ButtonLink href={loggedIn ? "/dashboard" : "/register"} size="lg" className="group">
              {loggedIn ? t("common.openDashboard") : t("landing.cta.button")}
              <ArrowRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
