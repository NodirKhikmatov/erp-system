"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { proxyFetch } from "@/lib/query-keys";

type LinkCodePayload = {
  code: string;
  expiresAt: string;
};

export function SettingsTelegramLinkCard() {
  const t = useTranslations("settings");
  const formatter = useFormatter();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = useCallback(async () => {
    setLoading(true);
    try {
      const res = await proxyFetch("integrations/telegram/link-code", {
        method: "POST",
      });
      if (res.status === 503) {
        toast.error(t("telegramUpstream"));
        setCode(null);
        setExpiresAt(null);
        return;
      }
      if (!res.ok) {
        const raw = await res.text();
        let msg = t("telegramError");
        try {
          const parsed = JSON.parse(raw) as { message?: unknown };
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.message === "string"
          ) {
            msg = parsed.message;
          }
        } catch {
          if (raw) {
            msg = raw.slice(0, 200);
          }
        }
        toast.error(msg);
        setCode(null);
        setExpiresAt(null);
        return;
      }
      const body = (await res.json()) as LinkCodePayload;
      if (!body?.code || !body?.expiresAt) {
        toast.error(t("telegramError"));
        setCode(null);
        setExpiresAt(null);
        return;
      }
      setCode(body.code);
      setExpiresAt(body.expiresAt);
      toast.success(t("telegramCodeReady"));
    } catch {
      toast.error(t("telegramError"));
      setCode(null);
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const copyStartCommand = useCallback(async () => {
    if (!code) {
      return;
    }
    const line = `/start ${code}`;
    try {
      await navigator.clipboard.writeText(line);
      toast.success(t("telegramCopied"));
    } catch {
      toast.error(t("telegramCopyFail"));
    }
  }, [code, t]);

  const expiresFormatted = expiresAt
    ? formatter.dateTime(new Date(expiresAt), {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>{t("telegramTitle")}</CardTitle>
        <CardDescription>{t("telegramSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          disabled={loading}
          onClick={() => void requestCode()}
        >
          {loading ? `${t("telegramGetCode")}…` : t("telegramGetCode")}
        </Button>
        {code ? (
          <div className="bg-muted/30 space-y-2 rounded-lg border p-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">
                {t("telegramExpires")}
              </p>
              <p className="font-medium">{expiresFormatted}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-2">{t("telegramSteps")}</p>
              <ol className="text-muted-foreground list-inside list-decimal space-y-2">
                <li>{t("telegramStepBot")}</li>
                <li>{t("telegramStepSend")}</li>
                <li>
                  <span className="text-foreground font-mono">
                    /start{" "}
                    <code className="bg-muted rounded px-1.5 py-0.5">
                      {code}
                    </code>
                  </span>
                </li>
              </ol>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copyStartCommand()}
            >
              {t("telegramCopyStart")}
            </Button>
          </div>
        ) : null}
        <p className="text-muted-foreground text-xs">{t("telegramHintBot")}</p>
      </CardContent>
    </Card>
  );
}
