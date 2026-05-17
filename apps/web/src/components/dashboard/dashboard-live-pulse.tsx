"use client";

import { cn } from "@furniture/ui";
import { useTranslations } from "next-intl";

export function DashboardLivePulse({ active }: { active?: boolean }) {
  const t = useTranslations("dashboard");
  const label = t("liveUpdating");
  return (
    <div
      className={cn(
        "border-border/80 bg-muted/40 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm",
      )}
      title={label}
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-2 rounded-full bg-emerald-500 opacity-75",
            active && "animate-ping",
          )}
        />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
      </span>
      {label}
    </div>
  );
}
