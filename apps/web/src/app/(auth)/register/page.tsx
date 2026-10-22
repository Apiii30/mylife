import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { googleEnabled } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  return { title: t("register") };
}

export default function RegisterPage() {
  return <RegisterForm googleEnabled={googleEnabled} />;
}
