import { AsyncLocalStorage } from "node:async_hooks";

import type { AppLocale } from "@furniture/types";

export const requestLocaleStorage = new AsyncLocalStorage<AppLocale>();

export function getRequestLocale(): AppLocale {
  return requestLocaleStorage.getStore() ?? "uz";
}
