import {
  OrderStatus,
  TaskStatus,
  orderStatusLabelsEn,
  orderStatusLabelsUz,
  taskStatusLabelsEn,
  taskStatusLabelsUz,
} from "@furniture/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import { env } from "@/env";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw;
  const t = await getTranslations({ locale, namespace: "common" });
  const user = await getCurrentUser();

  const orderLabels =
    locale === "en" ? orderStatusLabelsEn : orderStatusLabelsUz;
  const taskLabels = locale === "en" ? taskStatusLabelsEn : taskStatusLabelsUz;

  const apiHint = env.NEXT_PUBLIC_API_URL ?? t("home.envHint");

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 p-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LanguageSwitcher align="end" />
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">{t("home.kicker")}</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("home.title")}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          {t("home.intro")}{" "}
          <code className="bg-muted rounded-md px-1.5 py-0.5 text-xs">
            apps/api/src/modules
          </code>
          .
        </p>
        <Button asChild className="mt-2 w-fit">
          <Link href={user ? "/dashboard" : "/login"}>{t("home.appCta")}</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("home.cardServerTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3 text-sm">
            <p>
              {t("home.cardApiLabel")}{" "}
              <span className="text-foreground font-medium">{apiHint}</span>
            </p>
            <p className="text-xs">
              {t("home.cardPathsPrefix")}{" "}
              <code className="bg-muted rounded px-1">/salomatlik/jonli</code>{" "}
              {t("home.cardPathsMiddle")}{" "}
              <code className="bg-muted rounded px-1">/hujjatlar</code>
            </p>
            <Button asChild variant="secondary" size="sm">
              <a
                href="http://localhost:4000/salomatlik/jonli"
                rel="noreferrer"
                target="_blank"
              >
                {t("home.healthCta")}
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("home.cardStatesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              <span className="text-foreground font-medium">
                {t("home.orderLabel")}
              </span>
              : {t("home.systemCode")}{" "}
              <code className="bg-muted rounded px-1 text-xs">
                {OrderStatus.InProgress}
              </code>{" "}
              — «{orderLabels[OrderStatus.InProgress]}».
            </p>
            <p>
              <span className="text-foreground font-medium">
                {t("home.taskLabel")}
              </span>
              : {t("home.systemCode")}{" "}
              <code className="bg-muted rounded px-1 text-xs">
                {TaskStatus.Working}
              </code>{" "}
              — «{taskLabels[TaskStatus.Working]}».
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
