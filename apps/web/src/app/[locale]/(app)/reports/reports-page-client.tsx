"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@furniture/ui";
import { useTranslations } from "next-intl";

import { queryKeys, proxyFetch } from "@/lib/query-keys";
import type { CurrentUser } from "@/lib/auth/session";

type ReportRow = {
  id: string;
  message: string;
  createdAt: string;
  worker: { fullName: string; email: string };
  task: { title: string; status: string } | null;
};

export function ReportsPageClient({ user }: { user: CurrentUser }) {
  const tRep = useTranslations("reports");
  const tCommon = useTranslations("common");

  const scope = user.role === "WORKER" ? "my" : "all";

  const q = useQuery({
    queryKey: queryKeys.dailyReports.list(scope, 1, 25),
    queryFn: async () => {
      const path =
        scope === "my"
          ? "daily-reports/my?page=1&limit=25"
          : "daily-reports?page=1&limit=25";
      const res = await proxyFetch(path);
      if (!res.ok) {
        throw new Error("reports");
      }
      return (await res.json()) as {
        data: ReportRow[];
        meta: { total: number };
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tRep("title")}
        </h1>
        <p className="text-muted-foreground">{tRep("subtitle")}</p>
      </div>
      {q.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : null}
      {q.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : null}
      {!q.data?.data?.length ? (
        !q.isLoading && (
          <p className="text-muted-foreground text-sm">{tRep("empty")}</p>
        )
      ) : (
        <div className="space-y-3">
          {q.data.data.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">
                      {r.worker.fullName}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {r.worker.email}
                    </p>
                  </div>
                  <time
                    className="text-muted-foreground text-xs tabular-nums"
                    dateTime={r.createdAt}
                  >
                    {new Date(r.createdAt).toLocaleString()}
                  </time>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">
                    {tRep("message")}:{" "}
                  </span>
                  {r.message}
                </p>
                {r.task ? (
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-medium">
                      {tRep("task")}:{" "}
                    </span>
                    {r.task.title}{" "}
                    <span className="text-xs">({r.task.status})</span>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
