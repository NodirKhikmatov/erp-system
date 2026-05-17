"use client";

import { useTranslations } from "next-intl";

import type { AppIntlMessages } from "@/i18n/app-messages.schema";

/** Typed shortcut for one namespace (keys autocompleted when Messages are wired). */
export function useNs<N extends keyof AppIntlMessages>(namespace: N) {
  return useTranslations(namespace);
}
