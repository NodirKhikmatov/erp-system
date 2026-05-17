import type { AppLocale } from "./routing";
import { routing } from "./routing";

export { routing };
export type { AppLocale };
export type Locale = AppLocale;

export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;

export function isLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value);
}
