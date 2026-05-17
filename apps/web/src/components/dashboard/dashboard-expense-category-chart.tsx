"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Row = { category: string; total: number };

const COLORS = [
  "hsl(142 70% 40%)",
  "hsl(217 90% 55%)",
  "hsl(38 92% 50%)",
  "hsl(280 60% 50%)",
];

export function DashboardExpenseCategoryChart({
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
          {tDash("expenseByCategory")}
        </CardTitle>
        <CardDescription>{tDash("expenseByCategoryHint")}</CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {loading ? (
          <div className="space-y-3">
            <div className="bg-muted/60 h-[220px] animate-pulse rounded-xl" />
          </div>
        ) : null}
        {isError && !loading ? (
          <div className="text-destructive flex h-[220px] items-center justify-center text-sm">
            {tCommon("error")}
          </div>
        ) : null}
        {!loading && !isError && data.length === 0 ? (
          <div className="text-muted-foreground flex h-[220px] items-center justify-center text-sm">
            —
          </div>
        ) : null}
        {!loading && !isError && data.length > 0 ? (
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  labelLine={false}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={`c-${i}`}
                      fill={COLORS[i % COLORS.length] ?? "hsl(var(--muted))"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => {
                    const fmt = new Intl.NumberFormat(undefined, {
                      maximumFractionDigits: 0,
                    });
                    return [fmt.format(Number(v)), name];
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
