import { Button } from "@furniture/ui";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isLocale } from "@/i18n/config";

export default async function NotFound({
  params,
}: {
  params?: Promise<{ locale?: string }>;
}) {
  const p = params ? await params : undefined;
  const raw = p?.locale;
  const locale = raw && isLocale(raw) ? raw : undefined;
  const t = await getTranslations({
    locale: locale ?? "uz",
    namespace: "common",
  });

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-4xl font-semibold tabular-nums">
        {t("notFound.code")}
      </p>
      <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
      <p className="text-muted-foreground text-sm">{t("notFound.body")}</p>
      <Button asChild>
        <Link href="/">{t("notFound.cta")}</Link>
      </Button>
    </div>
  );
}
