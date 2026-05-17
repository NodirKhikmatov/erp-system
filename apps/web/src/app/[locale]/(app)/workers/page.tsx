import { redirect } from "@/i18n/navigation";

import { WorkersPageClient } from "./workers-page-client";
import { isLocale } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function WorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;
  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }
  return <WorkersPageClient user={user} />;
}
