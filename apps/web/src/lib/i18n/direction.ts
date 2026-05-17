import type { AppLocale } from "@/i18n/routing";

/** Extend when adding RTL languages (e.g. ar, he). */
const rtlLocales = new Set<AppLocale>([]);

export function getTextDirection(locale: string): "ltr" | "rtl" {
  return rtlLocales.has(locale as AppLocale) ? "rtl" : "ltr";
}
