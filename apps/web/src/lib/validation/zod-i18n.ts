import { z } from "zod";

/** Use with `useTranslations('validation')` — pass `t` into factories. */
export function zodEmail(t: (key: string) => string) {
  return z.string().min(1, t("email.required")).email(t("email.invalid"));
}

export function zodRequiredString(
  t: (key: string) => string,
  minLength = 1,
  messageKey: "required" | "email.required" = "required",
) {
  return z.string().min(minLength, t(messageKey));
}

export function zodPassword(
  t: (key: string, values?: { min: number }) => string,
  min = 8,
) {
  return z
    .string()
    .min(1, t("password.required"))
    .min(min, t("password.minLength", { min }));
}
