import { CreateOrderClient } from "./create-order-client";
import { isLocale } from "@/i18n/config";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export default async function NewOrderPage({
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
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return redirect({ href: "/orders", locale });
  }
  return <CreateOrderClient />;
}
