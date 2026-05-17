import { redirect } from "@/i18n/navigation";

import { WorkerHubClient } from "./worker-hub-client";
import { isLocale } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function WorkerHubPage({
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
  if (user.role !== "WORKER") {
    return redirect({ href: "/dashboard", locale });
  }
  return <WorkerHubClient user={user} />;
}
