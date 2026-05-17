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
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { period: string; total: number; label: string };

export function DashboardExpenseMonthlyChart({
  data,
  loading,
  isError,
}: {
  data: Row[];
  loading?: boolean;
  isError?: boolean;
}) {
  const tDash = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  return (
    <Card className="border-border/70 from-card to-muted/15 overflow-hidden rounded-2xl bg-gradient-to-b shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {tDash("monthlyExpenses")}
        </CardTitle>
        <CardDescription>{tDash("monthlyExpensesHint")}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {loading ? (
          <div className="bg-muted/60 h-[240px] animate-pulse rounded-xl" />
        ) : null}
        {isError && !loading ? (
          <div className="text-destructive flex h-[240px] items-center justify-center text-sm">
            {tCommon("error")}
          </div>
        ) : null}
        {!loading && !isError && data.length === 0 ? (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            —
          </div>
        ) : null}
        {!loading && !isError && data.length > 0 ? (
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
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
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                  formatter={(v: number) => [
                    new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: 0,
                    }).format(v),
                  ]}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(0 72% 50%)"
                  radius={[6, 6, 0, 0]}
                  name="expenses"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
