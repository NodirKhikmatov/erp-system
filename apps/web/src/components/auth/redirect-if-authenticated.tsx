import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * SSR da cookie bo‘lsa API chaqiradi — login HTML bloklanmasligi uchun Suspense bilan
 * o‘rash kerak (anonim foydalanuvchi: getCurrentUser cookie yo‘q bo‘lsa `/me` chaqirmaydi).
 */
export async function RedirectIfAuthenticated({
  locale,
}: {
  locale: AppLocale;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/dashboard", locale });
  }
  return null;
}
