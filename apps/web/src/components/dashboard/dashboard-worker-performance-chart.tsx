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
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  id: string;
  name: string;
  rate: number;
  done: number;
  open: number;
};

export function DashboardWorkerPerformanceChart({ data }: { data: Row[] }) {
  const tDash = useTranslations("dashboard");
  const tTasks = useTranslations("tasks");

  const chartData = [...data]
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .map((w) => ({
      ...w,
      shortName: w.name.length > 22 ? `${w.name.slice(0, 20)}…` : w.name,
    }));

  const barHeight = Math.min(420, Math.max(220, chartData.length * 40 + 80));

  if (chartData.length === 0) {
    return (
      <Card className="border-border/70 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {tDash("workerPerf")}
          </CardTitle>
          <CardDescription>{tDash("workerPerfHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 from-card via-card to-muted/20 rounded-2xl bg-gradient-to-br shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-lg font-semibold">
          {tDash("workerPerf")}
        </CardTitle>
        <CardDescription>{tDash("workerPerfHint")}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div style={{ height: barHeight }} className="w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                strokeDasharray="4 6"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={108}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 13,
                }}
                formatter={(value: number, _name, item) => {
                  const p = item.payload as Row;
                  return [
                    `${value}% · ${p.done} ${tDash("perfBarDone")} · ${p.open} ${tDash("perfBarOpen")}`,
                    tDash("rateLabel"),
                  ];
                }}
              />
              <Bar
                dataKey="rate"
                name={tDash("rateLabel")}
                radius={[0, 6, 6, 0]}
                barSize={18}
              >
                {chartData.map((e, i) => (
                  <Cell
                    key={e.id}
                    fill="var(--chart-revenue)"
                    fillOpacity={1 - i * 0.065}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
