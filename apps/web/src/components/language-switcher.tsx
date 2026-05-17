"use client";

import { Button } from "@furniture/ui";
import { Check, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher({
  align = "end",
}: {
  align?: "start" | "end";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common.locale");
  const [menuReady, setMenuReady] = useState(false);
  useEffect(() => {
    setMenuReady(true);
  }, []);

  if (!menuReady) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-border/80 gap-2"
        disabled
        aria-busy
        aria-label={t("label")}
      >
        <Languages className="size-4 opacity-80" aria-hidden />
        <span className="text-xs font-medium uppercase">{locale}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border/80 gap-2"
          aria-label={t("label")}
        >
          <Languages className="size-4 opacity-80" aria-hidden />
          <span className="text-xs font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[10rem]">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            className="cursor-pointer gap-2"
            disabled={loc === locale}
            onSelect={() => {
              router.replace(pathname, { locale: loc });
            }}
          >
            <span className="flex-1">{t(loc)}</span>
            {loc === locale ? (
              <Check className="size-4 opacity-70" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
