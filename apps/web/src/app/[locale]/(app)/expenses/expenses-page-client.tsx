"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardDescription, CardHeader, CardTitle } from "@furniture/ui";
import { useTranslations } from "next-intl";

import { DashboardExpenseCategoryChart } from "@/components/dashboard/dashboard-expense-category-chart";
import { DashboardExpenseMonthlyChart } from "@/components/dashboard/dashboard-expense-monthly-chart";
import { DashboardRecentExpenses } from "@/components/dashboard/dashboard-recent-expenses";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import type { CurrentUser } from "@/lib/auth/session";
import { useRealtimeStore } from "@/lib/stores/realtime-store";

type AnalyticsPrimary = {
  currency: string;
  revenue: number;
  expenses: number;
  profit: number;
};

const LIVE_MS = 30_000;

function fmtMoney(n: number, cur: string) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)} ${cur}`;
}

export function ExpensesPageClient({ user }: { user: CurrentUser }) {
  const tExp = useTranslations("expenses");
  const tDash = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const allowed = user.role === "ADMIN" || user.role === "MANAGER";
  const qc = useQueryClient();
  const connectForManager = useRealtimeStore((s) => s.connectForManager);
  const disconnect = useRealtimeStore((s) => s.disconnect);
  const lastOrderChange = useRealtimeStore((s) => s.lastOrderChange);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void connectForManager();
    return () => {
      disconnect();
    };
  }, [allowed, connectForManager, disconnect]);

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
      const body = (await res.json()) as { primary: AnalyticsPrimary };
      return body.primary;
    },
    enabled: allowed,
    refetchInterval: allowed ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

  const expenseRecent = useQuery({
    queryKey: queryKeys.expenses.recent(12, "UZS"),
    queryFn: async () => {
      const res = await proxyFetch("expenses/recent?limit=12&currency=UZS");
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
    enabled: allowed,
    refetchInterval: allowed ? LIVE_MS : false,
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
    enabled: allowed,
    refetchInterval: allowed ? LIVE_MS : false,
    refetchIntervalInBackground: true,
  });

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

  if (!allowed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {tExp("title")}
          </h1>
        </div>
        <p className="bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
          {tExp("restricted")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tExp("title")}
        </h1>
        <p className="text-muted-foreground max-w-2xl">{tExp("body")}</p>
      </div>

      <p className="text-muted-foreground text-sm">{tExp("totalsNote")}</p>

      {analytics.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : null}
      {analytics.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : null}

      {analytics.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{tDash("revenue")}</CardDescription>
              <CardTitle className="text-xl tabular-nums transition-colors duration-500">
                {fmtMoney(analytics.data.revenue, analytics.data.currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{tDash("expenses")}</CardDescription>
              <CardTitle className="text-destructive text-xl tabular-nums transition-colors duration-500">
                {fmtMoney(analytics.data.expenses, analytics.data.currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription>{tDash("profit")}</CardDescription>
              <CardTitle className="text-xl tabular-nums text-emerald-600 transition-colors duration-500 dark:text-emerald-400">
                {fmtMoney(analytics.data.profit, analytics.data.currency)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

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
    </div>
  );
}
