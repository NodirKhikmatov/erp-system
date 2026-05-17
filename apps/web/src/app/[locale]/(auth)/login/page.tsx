import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { isLocale } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import type { LoginAuthLabels } from "@/lib/auth-form-messages";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  const ta = await getTranslations({ locale, namespace: "auth" });
  const loginLabels: LoginAuthLabels = {
    kicker: ta("kicker"),
    signIn: ta("signIn"),
    cardSubtitle: ta("cardSubtitle"),
    email: ta("email"),
    password: ta("password"),
    errorRequired: ta("errorRequired"),
    errorInvalid: ta("errorInvalid"),
    errorUnreachable: ta("errorUnreachable"),
    submit: ta("submit"),
    noAccount: ta("noAccount"),
    signUp: ta("signUp"),
  };

  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated locale={locale} />
      </Suspense>
      <AuthCardShell
        kicker={loginLabels.kicker}
        title={loginLabels.signIn}
        subtitle={loginLabels.cardSubtitle}
      >
        <LoginForm locale={locale} labels={loginLabels} />
      </AuthCardShell>
    </>
  );
}
