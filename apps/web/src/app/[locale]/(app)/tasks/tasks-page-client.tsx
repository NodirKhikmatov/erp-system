"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/read-api-error-message";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  worker: { fullName: string } | null;
  order: { title: string | null };
};

function invalidateTasksAndOrders(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({
    predicate: (q) => q.queryKey[0] === "tasks" || q.queryKey[0] === "orders",
  });
}

export function TasksPageClient({ user }: { user: CurrentUser }) {
  const tTasks = useTranslations("tasks");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const scope = user.role === "WORKER" ? "my" : "all";
  const path =
    user.role === "WORKER"
      ? "tasks/my?page=1&limit=30"
      : "tasks?page=1&limit=30";

  const canDelete = user.role === "ADMIN" || user.role === "MANAGER";

  const q = useQuery({
    queryKey: queryKeys.tasks.list(scope, 1, 30),
    queryFn: async () => {
      const res = await proxyFetch(path);
      if (!res.ok) {
        throw new Error("tasks");
      }
      return (await res.json()) as { data: TaskRow[] };
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await proxyFetch(`tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
    },
    onSuccess: () => {
      invalidateTasksAndOrders(qc);
      toast.success(tTasks("toastTaskDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tTasks("title")}
        </h1>
        {canDelete ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {tTasks("managerDeleteHint")}
          </p>
        ) : null}
      </div>
      {q.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : null}
      {q.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : null}
      {!q.data?.data?.length ? (
        !q.isLoading && (
          <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
        )
      ) : (
        <div className="space-y-3">
          {q.data.data.map((task) => {
            const deleting =
              deleteMut.isPending && deleteMut.variables === task.id;
            return (
              <Card key={task.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base font-medium">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {task.title}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{task.status}</Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/tasks/${task.id}`}>
                        {tTasks("viewTask")}
                      </Link>
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleting}
                        onClick={(e) => {
                          e.preventDefault();
                          if (
                            !window.confirm(
                              tTasks("deleteTaskConfirm", {
                                title: task.title,
                              }),
                            )
                          ) {
                            return;
                          }
                          deleteMut.mutate(task.id);
                        }}
                      >
                        {deleting ? tCommon("loading") : tTasks("deleteTask")}
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  <p>
                    {tOrders("title")}:{" "}
                    <span className="text-foreground">
                      {task.order.title ?? "—"}
                    </span>
                  </p>
                  {task.worker ? (
                    <p>
                      {tTasks("assignee")}:{" "}
                      <span className="text-foreground">
                        {task.worker.fullName}
                      </span>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
