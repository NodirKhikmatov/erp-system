/**
 * Map backend / API error codes or HTTP status to translated `errors` namespace keys.
 * Prefer API responses like `{ "code": "NOT_FOUND" }` for stable i18n.
 */

export type ErrorTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function translateHttpError(t: ErrorTranslator, status: number): string {
  if (status === 401 || status === 403) {
    return t("api.forbidden");
  }
  if (status === 404) {
    return t("api.notFound");
  }
  if (status === 409) {
    return t("api.conflict");
  }
  if (status === 422 || status === 400) {
    return t("api.validation");
  }
  if (status === 429) {
    return t("api.rateLimited");
  }
  return t("api.unknown");
}

export function translateApiErrorCode(
  t: ErrorTranslator,
  code: string | undefined,
): string {
  if (!code) {
    return t("api.unknown");
  }
  const key = `codes.${code}`;
  const msg = t(key);
  if (msg === key) {
    return t("api.unknown");
  }
  return msg;
}
