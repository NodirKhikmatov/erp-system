import { AuthCardShell } from "@/components/auth/auth-card-shell";
import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";
import { SignupForm } from "@/components/auth/signup-form";
import { isLocale } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import type { SignupAuthLabels } from "@/lib/auth-form-messages";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function RegisterPage({
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
  const signupLabels: SignupAuthLabels = {
    kicker: ta("kicker"),
    signUp: ta("signUp"),
    registerSubtitle: ta("registerSubtitle"),
    fullName: ta("fullName"),
    email: ta("email"),
    password: ta("password"),
    passwordHint: ta("passwordHint"),
    roleLabel: ta("roleLabel"),
    roleWorker: ta("roleWorker"),
    roleManager: ta("roleManager"),
    registerSubmit: ta("registerSubmit"),
    registerSubmitting: ta("registerSubmitting"),
    registerErrorRequired: ta("registerErrorRequired"),
    registerErrorEmailTaken: ta("registerErrorEmailTaken"),
    registerErrorInvalid: ta("registerErrorInvalid"),
    registerErrorServer: ta("registerErrorServer"),
    errorUnreachable: ta("errorUnreachable"),
    haveAccount: ta("haveAccount"),
    signIn: ta("signIn"),
  };

  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfAuthenticated locale={locale} />
      </Suspense>
      <AuthCardShell
        kicker={signupLabels.kicker}
        title={signupLabels.signUp}
        subtitle={signupLabels.registerSubtitle}
      >
        <SignupForm locale={locale} labels={signupLabels} />
      </AuthCardShell>
    </>
  );
}
