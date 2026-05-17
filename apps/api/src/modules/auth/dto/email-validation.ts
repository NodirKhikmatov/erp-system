/** Ichki domen (@*.local) uchun `validator` `isEmail` parametrlari. */
export const EMAIL_VALIDATION_OPTIONS = {
  require_tld: false,
  allow_utf8_local_part: true,
} as const;
