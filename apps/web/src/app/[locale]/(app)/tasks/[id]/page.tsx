import { redirect } from "@/i18n/navigation";

import { TaskDetailClient } from "./task-detail-client";
import { isLocale } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;
  if (!UUID_RE.test(id)) {
    notFound();
  }
  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale });
  }
  return <TaskDetailClient taskId={id} user={user} />;
}
