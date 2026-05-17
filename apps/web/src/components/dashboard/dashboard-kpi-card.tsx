import { cn } from "@furniture/ui";
import type { LucideIcon } from "lucide-react";

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/70 from-card via-card to-muted/30 group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all duration-200",
        "hover:border-border hover:shadow-md",
        className,
      )}
    >
      <div className="bg-primary/[0.06] pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.14em]">
            {label}
          </p>
          <p
            className={cn(
              "text-foreground text-2xl font-semibold tabular-nums tracking-tight md:text-[1.65rem]",
              valueClassName,
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="text-muted-foreground text-xs">{hint}</p>
          ) : null}
        </div>
        <div className="border-border/60 bg-background/80 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-inner backdrop-blur-sm">
          <Icon className="size-5 opacity-90" aria-hidden />
        </div>
      </div>
    </div>
  );
}
