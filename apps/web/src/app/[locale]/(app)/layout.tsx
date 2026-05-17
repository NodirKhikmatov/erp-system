import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { isLocale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

export default async function AppGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    redirect({ href: "/dashboard", locale: routing.defaultLocale });
  }
  const locale = raw as AppLocale;
  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }
  return (
    <AppShell locale={locale} user={user}>
      {children}
    </AppShell>
  );
}
