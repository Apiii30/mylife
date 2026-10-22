import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
      <div className="flex flex-col gap-6 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-[13px] text-muted">{t("landing.footer.tagline")}</p>
        </div>
        <nav className="flex gap-6 text-[13px] text-ink-2">
          <a href="#features" className="hover:text-ink">
            {t("landing.nav.features")}
          </a>
          <a href="#goals" className="hover:text-ink">
            {t("landing.nav.goals")}
          </a>
          <a href="#why" className="hover:text-ink">
            {t("landing.nav.why")}
          </a>
        </nav>
      </div>
      <p className="mt-8 text-[12px] text-subtle">
        © {year} MyLife. {t("landing.footer.rights")}
      </p>
    </footer>
  );
}
