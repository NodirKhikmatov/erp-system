"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

type OrderRow = {
  id: string;
  title: string | null;
  status: string;
  totalPrice: number | null;
  currency: string;
  client: { fullName: string };
};

export function DashboardLatestOrders({
  orders,
  loading,
  isError,
}: {
  orders: OrderRow[];
  loading?: boolean;
  isError?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");

  return (
    <Card className="border-border/70 from-card to-muted/10 h-full rounded-2xl bg-gradient-to-b shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-lg font-semibold">
            {tDash("latestOrders")}
          </CardTitle>
          <CardDescription>{tDash("latestOrdersSubtitle")}</CardDescription>
        </div>
        <Link
          href="/orders"
          className="text-primary text-xs font-semibold hover:underline"
        >
          {tDash("viewOrders")}
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        ) : null}
        {isError && !loading ? (
          <p className="text-destructive text-sm">{tCommon("error")}</p>
        ) : null}
        {!loading && !isError && orders.length === 0 ? (
          <p className="text-muted-foreground text-sm">{tOrders("empty")}</p>
        ) : null}
        <ul className="max-h-[min(360px,55vh)] space-y-2 overflow-auto pr-1">
          {orders.map((o) => (
            <li
              key={o.id}
              className="border-border/60 bg-background/60 hover:bg-muted/40 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${o.id}`}
                    className="text-foreground hover:text-primary truncate text-sm font-medium leading-tight hover:underline"
                  >
                    {o.title ?? o.id.slice(0, 8)}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {tOrders("client")}:{" "}
                    <span className="text-foreground/90">
                      {o.client.fullName}
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {o.status}
                </Badge>
              </div>
              <p className="text-foreground/90 mt-1.5 text-xs font-medium tabular-nums">
                {o.totalPrice != null
                  ? `${o.totalPrice.toLocaleString()} ${o.currency}`
                  : "—"}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
