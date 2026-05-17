import { getRequestConfig } from "next-intl/server";

import { loadMessages } from "./load-messages";
import "./app-messages.schema";
import { routing } from "./routing";
import type { AppLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
