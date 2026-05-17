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
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/read-api-error-message";

type WorkerRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
};

export function WorkersPageClient({ user }: { user: CurrentUser }) {
  const tWorkers = useTranslations("workers");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const allowed = user.role === "ADMIN" || user.role === "MANAGER";
  const isAdmin = user.role === "ADMIN";

  const q = useQuery({
    queryKey: queryKeys.workers.list(1, 25),
    queryFn: async () => {
      const res = await proxyFetch("workers?page=1&limit=25");
      if (!res.ok) {
        throw new Error("workers");
      }
      return (await res.json()) as {
        data: WorkerRow[];
        meta: { total: number };
      };
    },
    enabled: allowed,
  });

  const toggleActiveMut = useMutation({
    mutationFn: async ({
      id,
      nextActive,
    }: {
      id: string;
      nextActive: boolean;
    }) => {
      const res = await proxyFetch(`workers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
      return (await res.json()) as WorkerRow;
    },
    onSuccess: (_data, { nextActive }) => {
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "workers",
      });
      toast.success(
        nextActive ? tWorkers("toastUnblocked") : tWorkers("toastBlocked"),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await proxyFetch(`workers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "workers",
      });
      toast.success(tWorkers("toastDeleted"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!allowed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {tWorkers("title")}
          </h1>
        </div>
        <p className="bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
          {tWorkers("restricted")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tWorkers("title")}
        </h1>
        {!isAdmin ? (
          <p className="text-muted-foreground mt-1 text-sm">
            {tWorkers("managerNote")}
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
          <p className="text-muted-foreground text-sm">{tWorkers("empty")}</p>
        )
      ) : (
        <div className="space-y-3">
          {q.data.data.map((w) => {
            const isSelf = w.id === user.id;
            const pendingPatch =
              toggleActiveMut.isPending &&
              toggleActiveMut.variables?.id === w.id;
            const pendingDelete =
              deleteMut.isPending && deleteMut.variables === w.id;
            return (
              <Card key={w.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base font-medium">
                    {w.fullName}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{w.role}</Badge>
                    <Badge variant={w.isActive ? "secondary" : "muted"}>
                      {w.isActive ? tWorkers("active") : tWorkers("inactive")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-3 text-sm">
                  <span className="text-foreground">{w.email}</span>
                  {isAdmin ? (
                    <div className="border-border flex flex-wrap gap-2 border-t pt-3">
                      {w.isActive ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSelf || pendingPatch || pendingDelete}
                          title={
                            isSelf ? tWorkers("selfActionDenied") : undefined
                          }
                          onClick={() =>
                            toggleActiveMut.mutate({
                              id: w.id,
                              nextActive: false,
                            })
                          }
                        >
                          {pendingPatch &&
                          toggleActiveMut.variables?.nextActive === false
                            ? tCommon("loading")
                            : tWorkers("block")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSelf || pendingPatch || pendingDelete}
                          title={
                            isSelf ? tWorkers("selfActionDenied") : undefined
                          }
                          onClick={() =>
                            toggleActiveMut.mutate({
                              id: w.id,
                              nextActive: true,
                            })
                          }
                        >
                          {pendingPatch &&
                          toggleActiveMut.variables?.nextActive === true
                            ? tCommon("loading")
                            : tWorkers("unblock")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isSelf || pendingPatch || pendingDelete}
                        title={
                          isSelf ? tWorkers("selfActionDenied") : undefined
                        }
                        onClick={() => {
                          if (
                            !window.confirm(
                              tWorkers("deleteConfirm", {
                                name: w.fullName,
                              }),
                            )
                          ) {
                            return;
                          }
                          deleteMut.mutate(w.id);
                        }}
                      >
                        {pendingDelete
                          ? tCommon("loading")
                          : tWorkers("delete")}
                      </Button>
                    </div>
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
