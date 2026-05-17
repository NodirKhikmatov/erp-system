import type { AppLocale } from "@furniture/types";

const PRIMARY: AppLocale = "uz";

/** `Accept-Language` dan `uz` yoki `en` ni tanlaydi (standart — o‘zbekcha). */
export function parseLocale(
  acceptLanguage: string | string[] | undefined,
): AppLocale {
  if (!acceptLanguage) {
    return PRIMARY;
  }
  const raw = Array.isArray(acceptLanguage)
    ? acceptLanguage[0]
    : acceptLanguage;
  if (raw === undefined || raw === "") {
    return PRIMARY;
  }
  const first = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("en")) {
    return "en";
  }
  return PRIMARY;
}
