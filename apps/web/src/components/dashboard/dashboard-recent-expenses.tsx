"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@furniture/ui";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type Row = {
  id: string;
  title: string | null;
  category: string;
  amount: number;
  currency: string;
  createdAt: string;
  order: {
    id: string;
    title: string | null;
    orderNumber: string | null;
  } | null;
};

function fmtMoney(n: number, cur: string) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)} ${cur}`;
}

export function DashboardRecentExpenses({
  rows,
  loading,
  isError,
}: {
  rows: Row[];
  loading?: boolean;
  isError?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Card className="border-border/70 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {tDash("recentExpenses")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ul className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="bg-muted/60 h-10 animate-pulse rounded-md"
              />
            ))}
          </ul>
        ) : null}
        {isError && !loading ? (
          <p className="text-destructive text-sm">{tCommon("error")}</p>
        ) : null}
        {!loading && !isError && rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tCommon("noResults")}
          </p>
        ) : null}
        {!loading && !isError && rows.length > 0 ? (
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {rows.map((r) => (
              <li
                key={r.id}
                className="border-border/50 bg-muted/10 flex flex-col gap-0.5 rounded-lg border px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-foreground font-medium">
                    {r.title ?? r.category}
                  </span>
                  <span className="text-destructive tabular-nums">
                    {fmtMoney(r.amount, r.currency)}
                  </span>
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                  {r.order ? (
                    <Link
                      href={`/orders/${r.order.id}`}
                      className="text-primary hover:underline"
                    >
                      {r.order.orderNumber ??
                        r.order.title ??
                        r.order.id.slice(0, 8)}
                    </Link>
                  ) : null}
                  <span>· {r.category}</span>
                  <span>· {new Date(r.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
