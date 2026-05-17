"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@furniture/ui";
import {
  Activity,
  CreditCard,
  Layers3,
  ListTodo,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardKpiCard } from "@/components/dashboard/dashboard-kpi-card";
import { DashboardLatestOrders } from "@/components/dashboard/dashboard-latest-orders";
import { DashboardLivePulse } from "@/components/dashboard/dashboard-live-pulse";
import { DashboardRecentExpenses } from "@/components/dashboard/dashboard-recent-expenses";
import { Badge } from "@/components/ui/badge";
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { useRealtimeStore } from "@/lib/stores/realtime-store";

function ChartChunkPlaceholder() {
  return (
    <div
      className="border-border/50 bg-muted/30 min-h-[280px] animate-pulse rounded-xl border"
      aria-hidden
    />
  );
}

/** recharts katta — sahifa va dev HMR yengil boʻlishi uchun alohida chunk. */
const DashboardExpenseCategoryChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-expense-category-chart").then(
      (m) => ({ default: m.DashboardExpenseCategoryChart }),
    ),
  { ssr: false, loading: ChartChunkPlaceholder },
);

const DashboardExpenseMonthlyChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-expense-monthly-chart").then(
      (m) => ({ default: m.DashboardExpenseMonthlyChart }),
    ),
  { ssr: false, loading: ChartChunkPlaceholder },
);

const DashboardRevenueChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-revenue-chart").then((m) => ({
      default: m.DashboardRevenueChart,
    })),
  { ssr: false, loading: ChartChunkPlaceholder },
);

const DashboardWorkerPerformanceChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-worker-performance-chart").then(
      (m) => ({ default: m.DashboardWorkerPerformanceChart }),
    ),
  { ssr: false, loading: ChartChunkPlaceholder },
);

const LIVE_MS = 30_000;

type AnalyticsPayload = {
  primary: {
    currency: string;
    revenue: number;
    expenses: number;
    profit: number;
  };
  orders: {
    active: number;
    total: number;
    byStatus: { status: string; count: number }[];
  };
  tasks: { completed: number };
  workerPerformance: {
    workerId: string;
    fullName: string;
    tasksCompletedInPeriod: number;
    openTasks: number;
    completionRatePercent: number;
  }[];
};

type OrderAnalyticsPayload = {
  from: string;
  to: string;
  bucket: "day" | "week" | "month";
  series: {
    period: string;
    ordersCreated: number;
    revenue: number;
    expenses: number;
  }[];
};

type OrderRow = {
  id: string;
  title: string | null;
  status: string;
  totalPrice: number | null;
  currency: string;
  client: { fullName: string };
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  order?: { title: string | null };
};

function fmtMoney(n: number, cur: string) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)} ${cur}`;
}

function chartPointLabel(iso: string, bucket: "day" | "week" | "month") {
  const d = new Date(iso);
  if (bucket === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DashboardPageClient({ user }: { user: CurrentUser }) {
  const tAuth = useTranslations("auth");
  const tDash = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common");

  const canAnalytics = user.role === "ADMIN" || user.role === "MANAGER";
  const qc = useQueryClient();
  const connectForManager = useRealtimeStore((s) => s.connectForManager);
  const disconnect = useRealtimeStore((s) => s.disconnect);
  const lastOrderChange = useRealtimeStore((s) => s.lastOrderChange);

  useEffect(() => {
    if (!canAnalytics) {
      return;
    }
    void connectForManager();
    return () => {
      disconnect();
    };
  }, [canAnalytics, connectForManager, disconnect]);

  useEffect(() => {
    const ev = lastOrderChange as { kind?: string } | undefined;
    if (!ev?.kind?.startsWith("expense.")) {
      return;
    }
    void qc.invalidateQueries({ queryKey: ["analytics"] });
    void qc.invalidateQueries({ queryKey: ["expenses"] });
    void qc.invalidateQueries({ queryKey: ["orders"] });
  }, [lastOrderChange, qc]);

  const analytics = useQuery({
    queryKey: queryKeys.analytics.dashboard(undefined, undefined, "UZS"),
    queryFn: async () => {
      const res = await proxyFetch("analytics/dashboard?currency=UZS");
      if (!res.ok) {
        throw new Error("analytics");
      }
      return (await res.json()) as AnalyticsPayload;
    },
    enabled: canAnalytics,
    refetchInterval: canAnalytics ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const orderSeries = useQuery({
    queryKey: queryKeys.orders.analytics("day"),
    queryFn: async () => {
      const res = await proxyFetch("orders/analytics?bucket=day");
      if (!res.ok) {
        throw new Error("order-analytics");
      }
      return (await res.json()) as OrderAnalyticsPayload;
    },
    enabled: canAnalytics,
    refetchInterval: canAnalytics ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const latestOrdersQ = useQuery({
    queryKey: queryKeys.orders.latest(),
    queryFn: async () => {
      const res = await proxyFetch(
        "orders?page=1&limit=7&sortBy=createdAt&sortOrder=desc",
      );
      if (!res.ok) {
        throw new Error("orders");
      }
      return (await res.json()) as {
        data: OrderRow[];
        meta: { total: number };
      };
    },
    enabled: canAnalytics,
    refetchInterval: canAnalytics ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const expenseRecent = useQuery({
    queryKey: queryKeys.expenses.recent(8, "UZS"),
    queryFn: async () => {
      const res = await proxyFetch("expenses/recent?limit=8&currency=UZS");
      if (!res.ok) {
        throw new Error("exp-recent");
      }
      return (await res.json()) as {
        data: {
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
        }[];
      };
    },
    enabled: canAnalytics,
    refetchInterval: canAnalytics ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const expenseAnalytics = useQuery({
    queryKey: queryKeys.expenses.analytics("UZS"),
    queryFn: async () => {
      const res = await proxyFetch("expenses/analytics?currency=UZS");
      if (!res.ok) {
        throw new Error("exp-analytics");
      }
      return (await res.json()) as {
        currency: string;
        byCategory: { category: string; total: number }[];
        monthly: { period: string; total: number }[];
      };
    },
    enabled: canAnalytics,
    refetchInterval: canAnalytics ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const myTasks = useQuery({
    queryKey: queryKeys.tasks.list("my", 1, 8),
    queryFn: async () => {
      const res = await proxyFetch("tasks/my?page=1&limit=8");
      if (!res.ok) {
        throw new Error("tasks");
      }
      return (await res.json()) as {
        data: TaskRow[];
        meta: { total: number };
      };
    },
    refetchInterval: LIVE_MS,
    refetchIntervalInBackground: true,
  });

  const chartData = useMemo(() => {
    if (!orderSeries.data?.series?.length) {
      return [];
    }
    const { bucket, series } = orderSeries.data;
    return series.map((p) => ({
      period: p.period,
      label: chartPointLabel(p.period, bucket),
      revenue: p.revenue,
      expenses: p.expenses,
      profit: p.revenue - p.expenses,
      ordersCreated: p.ordersCreated,
    }));
  }, [orderSeries.data]);

  const chartSubtitle = orderSeries.data
    ? `${new Date(orderSeries.data.from).toLocaleDateString()} · ${new Date(orderSeries.data.to).toLocaleDateString()}`
    : tDash("chartSubtitle");

  const workerBarData = useMemo(() => {
    const rows = analytics.data?.workerPerformance;
    if (!rows?.length) {
      return [];
    }
    return rows.map((w) => ({
      id: w.workerId,
      name: w.fullName,
      rate: w.completionRatePercent,
      done: w.tasksCompletedInPeriod,
      open: w.openTasks,
    }));
  }, [analytics.data?.workerPerformance]);

  const expenseMonthlyChart = useMemo(() => {
    const m = expenseAnalytics.data?.monthly;
    if (!m?.length) {
      return [];
    }
    return m.map((row) => ({
      ...row,
      label: row.period,
    }));
  }, [expenseAnalytics.data?.monthly]);

  const adminLive =
    canAnalytics &&
    (analytics.isFetching ||
      orderSeries.isFetching ||
      latestOrdersQ.isFetching ||
      expenseRecent.isFetching ||
      expenseAnalytics.isFetching);

  if (!canAnalytics) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 pb-10">
        <header className="border-border/60 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {tDash("title")}
            </h1>
            <p className="text-muted-foreground">{tDash("subtitle")}</p>
          </div>
          <DashboardLivePulse active={myTasks.isFetching} />
        </header>

        <p className="border-border/80 bg-muted/20 text-muted-foreground rounded-2xl border border-dashed px-5 py-4 text-sm">
          {tDash("noAnalytics")}
        </p>

        <Card className="border-border/70 from-card to-muted/15 rounded-2xl bg-gradient-to-b shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ListTodo className="text-primary size-5" aria-hidden />
              {tDash("myOpenTasks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {tCommon("loading")}
              </p>
            ) : null}
            {myTasks.isError ? (
              <p className="text-muted-foreground text-sm">
                {tCommon("error")}
              </p>
            ) : null}
            {myTasks.data?.data?.length ? (
              <ul className="space-y-2 text-sm">
                {myTasks.data.data.map((task) => (
                  <li
                    key={task.id}
                    className="border-border/60 bg-background/50 flex flex-col gap-1 rounded-xl border px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <span className="font-medium">{task.title}</span>
                    <div className="flex items-center gap-2">
                      {task.order?.title ? (
                        <span className="text-muted-foreground text-xs">
                          {task.order.title}
                        </span>
                      ) : null}
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !myTasks.isLoading ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <header className="border-border/60 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
            {tAuth("kicker")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {tDash("title")}
          </h1>
          <p className="text-muted-foreground max-w-xl">{tDash("subtitle")}</p>
        </div>
        <DashboardLivePulse active={!!adminLive} />
      </header>

      {analytics.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : null}
      {analytics.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : null}

      {analytics.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <DashboardKpiCard
              label={tDash("revenue")}
              value={fmtMoney(
                analytics.data.primary.revenue,
                analytics.data.primary.currency,
              )}
              icon={Wallet}
              className="xl:col-span-1"
              valueClassName="transition-colors duration-500"
            />
            <DashboardKpiCard
              label={tDash("expenses")}
              value={fmtMoney(
                analytics.data.primary.expenses,
                analytics.data.primary.currency,
              )}
              valueClassName="text-destructive transition-colors duration-500"
              icon={CreditCard}
            />
            <DashboardKpiCard
              label={tDash("profit")}
              value={fmtMoney(
                analytics.data.primary.profit,
                analytics.data.primary.currency,
              )}
              valueClassName="text-emerald-600 transition-colors duration-500 dark:text-emerald-400"
              icon={TrendingUp}
            />
            <DashboardKpiCard
              label={tDash("activeOrders")}
              value={String(analytics.data.orders.active)}
              hint={`${tOrders("total")}: ${analytics.data.orders.total} · ${tDash("kpiActiveHint")}`}
              icon={Layers3}
              valueClassName="transition-colors duration-500"
            />
            <DashboardKpiCard
              label={tDash("completedTasks")}
              value={String(analytics.data.tasks.completed)}
              icon={Activity}
              valueClassName="transition-colors duration-500"
            />
          </section>

          {analytics.data.orders.byStatus?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {tOrders("status")}:
              </span>
              {analytics.data.orders.byStatus.map((s) => (
                <Badge
                  key={s.status}
                  variant="secondary"
                  className="font-normal tabular-nums"
                >
                  {s.status}
                  <span className="text-muted-foreground mx-1">·</span>
                  {s.count}
                </Badge>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {analytics.data ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <DashboardExpenseCategoryChart
            data={expenseAnalytics.data?.byCategory ?? []}
            loading={expenseAnalytics.isLoading}
            isError={expenseAnalytics.isError}
          />
          <DashboardExpenseMonthlyChart
            data={expenseMonthlyChart}
            loading={expenseAnalytics.isLoading}
            isError={expenseAnalytics.isError}
          />
          <DashboardRecentExpenses
            rows={expenseRecent.data?.data ?? []}
            loading={expenseRecent.isLoading}
            isError={expenseRecent.isError}
          />
        </section>
      ) : null}

      {analytics.data ? (
        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <DashboardRevenueChart
              subtitle={chartSubtitle}
              data={chartData}
              loading={orderSeries.isLoading}
              isError={orderSeries.isError}
            />
            <DashboardWorkerPerformanceChart data={workerBarData} />
          </div>
          <div className="xl:col-span-1">
            <DashboardLatestOrders
              orders={latestOrdersQ.data?.data ?? []}
              loading={latestOrdersQ.isLoading}
              isError={latestOrdersQ.isError}
            />
          </div>
        </section>
      ) : null}

      <section>
        <Card className="border-border/70 from-card to-muted/10 rounded-2xl bg-gradient-to-b shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ListTodo className="text-primary size-5" aria-hidden />
              {tDash("myOpenTasks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.isLoading ? (
              <p className="text-muted-foreground text-sm">
                {tCommon("loading")}
              </p>
            ) : null}
            {myTasks.isError ? (
              <p className="text-muted-foreground text-sm">
                {tCommon("error")}
              </p>
            ) : null}
            {myTasks.data?.data?.length ? (
              <ul className="grid gap-2 text-sm md:grid-cols-2">
                {myTasks.data.data.map((task) => (
                  <li
                    key={task.id}
                    className="border-border/60 bg-background/50 flex flex-col gap-1 rounded-xl border px-4 py-3"
                  >
                    <span className="font-medium">{task.title}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.order?.title ? (
                        <span className="text-muted-foreground text-xs">
                          {task.order.title}
                        </span>
                      ) : null}
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : !myTasks.isLoading ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
