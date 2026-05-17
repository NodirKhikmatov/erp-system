"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useTranslations } from "next-intl";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  period: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  ordersCreated: number;
};

export function DashboardRevenueChart({
  subtitle,
  data,
  loading,
  isError,
}: {
  subtitle: string;
  data: Point[];
  loading?: boolean;
  isError?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Card className="border-border/70 from-card to-muted/15 overflow-hidden rounded-2xl bg-gradient-to-b shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {tDash("chartTitle")}
        </CardTitle>
        <CardDescription>
          {subtitle}
          <span className="text-muted-foreground mt-1 block text-xs">
            {tDash("profitTrendHint")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {loading ? (
          <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
            {tCommon("loading")}
          </div>
        ) : null}
        {isError && !loading ? (
          <div className="text-destructive flex h-[280px] items-center justify-center text-sm">
            {tCommon("error")}
          </div>
        ) : null}
        {!loading && !isError && data.length === 0 ? (
          <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
            —
          </div>
        ) : null}
        {!loading && !isError && data.length > 0 ? (
          <div className="h-[280px] w-full min-w-0 sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-revenue)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-revenue)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 6"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={44}
                  tickFormatter={(v) =>
                    typeof v === "number" && v >= 1000
                      ? `${(v / 1000).toFixed(1)}k`
                      : String(v)
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={44}
                  tickFormatter={(v) =>
                    typeof v === "number" && v >= 1000
                      ? `${(v / 1000).toFixed(1)}k`
                      : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13,
                  }}
                  labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
                  formatter={(value: number, name: string) => {
                    const n = Number(value);
                    const fmt = new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: n >= 100 ? 0 : 2,
                    });
                    return [fmt.format(n), name];
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name={tDash("revenueAxis")}
                  stroke="var(--chart-revenue)"
                  strokeWidth={2}
                  fill="url(#fillRevenue)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="expenses"
                  name={tDash("expensesAxis")}
                  stroke="var(--chart-expenses)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  name={tDash("profit")}
                  stroke="hsl(142 70% 40%)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 4"
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
