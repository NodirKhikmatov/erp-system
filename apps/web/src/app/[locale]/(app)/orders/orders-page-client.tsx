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

type OrderRow = {
  id: string;
  title: string | null;
  status: string;
  totalPrice: number | null;
  currency: string;
  client: { fullName: string };
};

function invalidateOrdersTasksAnalytics(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({
    predicate: (q) =>
      q.queryKey[0] === "orders" ||
      q.queryKey[0] === "tasks" ||
      q.queryKey[0] === "analytics",
  });
}

export function OrdersPageClient({ user }: { user: CurrentUser }) {
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const canCreate = user.role === "ADMIN" || user.role === "MANAGER";
  const canDelete = canCreate;

  const q = useQuery({
    queryKey: queryKeys.orders.list(1, 25),
    queryFn: async () => {
      const res = await proxyFetch("orders?page=1&limit=25");
      if (!res.ok) {
        throw new Error("orders");
      }
      return (await res.json()) as {
        data: OrderRow[];
        meta: { total: number };
      };
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await proxyFetch(`orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
    },
    onSuccess: () => {
      invalidateOrdersTasksAnalytics(qc);
      toast.success(tOrders("toastOrderDeleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tOrders("title")}
        </h1>
        {canCreate ? (
          <Button asChild size="sm">
            <Link href="/orders/new">{tOrders("newOrder")}</Link>
          </Button>
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
          <p className="text-muted-foreground text-sm">{tOrders("empty")}</p>
        )
      ) : (
        <div className="space-y-3">
          {q.data.data.map((o) => {
            const titleLabel = o.title ?? o.id.slice(0, 8);
            const deleting =
              deleteMut.isPending && deleteMut.variables === o.id;
            return (
              <Card key={o.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-base font-medium">
                    <Link
                      href={`/orders/${o.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {titleLabel}
                    </Link>
                  </CardTitle>
                  <Badge variant="outline">{o.status}</Badge>
                </CardHeader>
                <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
                  <span>
                    {tOrders("client")}:{" "}
                    <span className="text-foreground">{o.client.fullName}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="text-foreground tabular-nums">
                      {o.totalPrice != null
                        ? `${o.totalPrice.toLocaleString()} ${o.currency}`
                        : "—"}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/orders/${o.id}`}>
                        {tOrders("viewOrder")}
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
                              tOrders("deleteOrderConfirm", {
                                title: titleLabel,
                              }),
                            )
                          ) {
                            return;
                          }
                          deleteMut.mutate(o.id);
                        }}
                      >
                        {deleting ? tCommon("loading") : tOrders("deleteOrder")}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
