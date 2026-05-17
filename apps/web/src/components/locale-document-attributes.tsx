"use client";

import { useEffect } from "react";

import { getTextDirection } from "@/lib/i18n/direction";

export function LocaleDocumentAttributes({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getTextDirection(locale);
  }, [locale]);
  return null;
}
