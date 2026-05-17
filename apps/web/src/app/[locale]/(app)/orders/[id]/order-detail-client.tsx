"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RemoteImageStrip } from "@/components/media/remote-image-thumbnail";
import { OrderExpenseSheet } from "@/components/orders/order-expense-sheet";
import { Link, useRouter } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/read-api-error-message";
import { useRealtimeStore } from "@/lib/stores/realtime-store";

type OrderTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority?: number;
  estimatedHours?: number | null;
  assignee: { id: string; fullName: string; role: string } | null;
  dueDate: string | null;
  sortOrder: number;
};

type OrderExpense = {
  id: string;
  title: string | null;
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  incurredOn: string;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber?: string | null;
  status: string;
  title: string | null;
  description: string | null;
  totalPrice: number | null;
  totalExpenses?: number;
  profit?: number | null;
  currency: string;
  deadline: string | null;
  referenceImages?: string[];
  progress?: { total: number; done: number; percent: number };
  client: { id: string; fullName: string };
  tasks: OrderTask[];
  expenses?: OrderExpense[];
};

type WorkerOption = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
};

type ActivityRow = {
  id: string;
  action: string;
  createdAt: string;
  meta: unknown;
  actor: { fullName: string } | null;
};

export function OrderDetailClient({
  orderId,
  user,
}: {
  orderId: string;
  user: CurrentUser;
}) {
  const formId = useId();
  const tOrders = useTranslations("orders");
  const tTasks = useTranslations("tasks");
  const tExp = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const router = useRouter();

  const connectForOrder = useRealtimeStore((s) => s.connectForOrder);
  const disconnect = useRealtimeStore((s) => s.disconnect);
  const lastOrderProgress = useRealtimeStore((s) => s.lastOrderProgress);
  const lastOrderChange = useRealtimeStore((s) => s.lastOrderChange);

  const canAssign = user.role === "ADMIN" || user.role === "MANAGER";

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priorityStr, setPriorityStr] = useState("0");
  const [hoursStr, setHoursStr] = useState("");
  const [feedback, setFeedback] = useState<
    "success" | "assignee" | "fail" | null
  >(null);

  useEffect(() => {
    void connectForOrder(orderId);
    return () => {
      disconnect();
    };
  }, [orderId, connectForOrder, disconnect]);

  useEffect(() => {
    const p = lastOrderProgress as { orderId?: string } | undefined;
    if (p && typeof p === "object" && p.orderId === orderId) {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    }
  }, [lastOrderProgress, orderId, qc]);

  useEffect(() => {
    const p = lastOrderChange as
      | { orderId?: string; kind?: string }
      | undefined;
    if (p && p.orderId === orderId && p.kind === "expense.created") {
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void qc.invalidateQueries({
        queryKey: queryKeys.activity.forEntity("order", orderId),
      });
    }
  }, [lastOrderChange, orderId, qc]);

  const orderQ = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const res = await proxyFetch(`orders/${orderId}`);
      if (!res.ok) {
        throw new Error("order-detail");
      }
      return (await res.json()) as OrderDetail;
    },
  });

  const activityQ = useQuery({
    queryKey: queryKeys.activity.forEntity("order", orderId),
    queryFn: async () => {
      const res = await proxyFetch(
        `activity-logs?entityType=order&entityId=${orderId}&take=30`,
      );
      if (!res.ok) {
        throw new Error("activity");
      }
      return (await res.json()) as { data: ActivityRow[] };
    },
    enabled: canAssign,
  });

  const workersQ = useQuery({
    queryKey: [...queryKeys.workers.list(1, 100), "WORKER", true] as const,
    queryFn: async () => {
      const res = await proxyFetch(
        "workers?page=1&limit=100&role=WORKER&isActive=true",
      );
      if (!res.ok) {
        throw new Error("workers");
      }
      return (await res.json()) as { data: WorkerOption[] };
    },
    enabled: canAssign,
  });

  const deleteOrderMut = useMutation({
    mutationFn: async () => {
      const res = await proxyFetch(`orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "orders" ||
          q.queryKey[0] === "tasks" ||
          q.queryKey[0] === "analytics",
      });
      disconnect();
      toast.success(tOrders("toastOrderDeleted"));
      router.push("/orders");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMut = useMutation({
    mutationFn: async () => {
      const dueDate = dueLocal.trim()
        ? new Date(dueLocal).toISOString()
        : undefined;
      const prio = Number.parseInt(priorityStr, 10);
      const hrs = hoursStr.trim() ? Number(hoursStr) : undefined;
      const res = await proxyFetch(`orders/${orderId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            {
              title: title.trim(),
              ...(description.trim()
                ? { description: description.trim() }
                : {}),
              assigneeId: assigneeId || undefined,
              ...(dueDate ? { dueDate } : {}),
              ...(!Number.isNaN(prio) && prio > 0 ? { priority: prio } : {}),
              ...(hrs != null && !Number.isNaN(hrs)
                ? { estimatedHours: hrs }
                : {}),
            },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error("assign");
      }
      return (await res.json()) as OrderDetail;
    },
    onSuccess: () => {
      setFeedback("success");
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void qc.invalidateQueries({
        queryKey: queryKeys.activity.forEntity("order", orderId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(1, 25) });
      void qc.invalidateQueries({
        queryKey: queryKeys.tasks.list("all", 1, 30),
      });
      setTitle("");
      setDescription("");
      setDueLocal("");
      setAssigneeId("");
      setPriorityStr("0");
      setHoursStr("");
    },
    onError: () => {
      setFeedback("fail");
    },
  });

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const prog = orderQ.data?.progress;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1 px-0">
          <Link href="/orders">
            <ArrowLeft className="size-4" aria-hidden />
            {tOrders("backToList")}
          </Link>
        </Button>
        {orderQ.isLoading ? (
          <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
        ) : null}
        {orderQ.isError ? (
          <p className="text-destructive text-sm">{tCommon("error")}</p>
        ) : null}
        {orderQ.data ? (
          <header className="border-border/60 space-y-2 border-b pb-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {orderQ.data.orderNumber ? (
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    {tOrders("orderNo")} {orderQ.data.orderNumber}
                  </p>
                ) : null}
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {orderQ.data.title ?? tOrders("detailTitle")}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{orderQ.data.status}</Badge>
                {canAssign ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleteOrderMut.isPending}
                    onClick={() => {
                      const lbl =
                        orderQ.data!.title ??
                        orderQ.data!.orderNumber ??
                        orderId.slice(0, 8);
                      if (
                        !window.confirm(
                          tOrders("deleteOrderConfirm", { title: lbl }),
                        )
                      ) {
                        return;
                      }
                      deleteOrderMut.mutate();
                    }}
                  >
                    {deleteOrderMut.isPending
                      ? tCommon("loading")
                      : tOrders("deleteOrder")}
                  </Button>
                ) : null}
              </div>
            </div>
            {prog ? (
              <div className="space-y-1">
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>{tOrders("progressLabel")}</span>
                  <span className="tabular-nums">
                    {prog.done}/{prog.total} ({prog.percent}%)
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${prog.percent}%` }}
                  />
                </div>
              </div>
            ) : null}
            <p className="text-muted-foreground text-sm">
              {tOrders("client")}:{" "}
              <span className="text-foreground">
                {orderQ.data.client.fullName}
              </span>
            </p>
            {orderQ.data.description ? (
              <p className="text-muted-foreground max-w-2xl text-sm">
                <span className="text-foreground font-medium">
                  {tOrders("description")}:{" "}
                </span>
                {orderQ.data.description}
              </p>
            ) : null}
            {orderQ.data.deadline ? (
              <p className="text-muted-foreground text-sm">
                {tOrders("deadline")}:{" "}
                <span className="text-foreground">
                  {new Date(orderQ.data.deadline).toLocaleString()}
                </span>
              </p>
            ) : null}
            {orderQ.data.totalPrice != null ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                {tOrders("total")}:{" "}
                <span className="text-foreground">
                  {orderQ.data.totalPrice.toLocaleString()}{" "}
                  {orderQ.data.currency}
                </span>
              </p>
            ) : null}
            {orderQ.data.referenceImages &&
            orderQ.data.referenceImages.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {tOrders("referencesHeading")}
                </p>
                <RemoteImageStrip
                  urls={orderQ.data.referenceImages}
                  altPrefix={tOrders("referencesHeading")}
                  className="pt-1"
                />
                <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {orderQ.data.referenceImages.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {url.slice(0, 64)}
                        {url.length > 64 ? "…" : ""}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </header>
        ) : null}
      </div>

      {orderQ.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/70 shadow-sm transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {tOrders("total")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground text-xl font-semibold tabular-nums">
                  {orderQ.data.totalPrice != null
                    ? `${orderQ.data.totalPrice.toLocaleString()} ${orderQ.data.currency}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/25 shadow-sm transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-destructive text-sm font-medium">
                  {tOrders("totalExpensesLabel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-destructive text-xl font-semibold tabular-nums">
                  {(orderQ.data.totalExpenses ?? 0).toLocaleString()}{" "}
                  {orderQ.data.currency}
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30 shadow-sm transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {tOrders("netProfitLabel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-xl font-semibold tabular-nums ${
                    (orderQ.data.profit ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {orderQ.data.profit != null
                    ? `${orderQ.data.profit.toLocaleString()} ${orderQ.data.currency}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {tOrders("expensesHeading")}
              </h2>
              {canAssign ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setExpenseSheetOpen(true)}
                >
                  {tOrders("addExpense")}
                </Button>
              ) : null}
            </div>
            {!orderQ.data.expenses?.length ? (
              <p className="text-muted-foreground text-sm">
                {tExp("noneOnOrder")}
              </p>
            ) : (
              <div className="border-border/60 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground border-b text-left">
                      <th className="px-3 py-2 font-medium">
                        {tOrders("expenseDate")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {tExp("fieldTitle")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {tExp("fieldCategory")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {tExp("fieldAmount")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {tExp("fieldNotes")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderQ.data.expenses.map((ex) => (
                      <tr
                        key={ex.id}
                        className="border-border/40 border-b last:border-0"
                      >
                        <td className="text-muted-foreground px-3 py-2">
                          {new Date(ex.incurredOn).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {ex.title ?? "—"}
                        </td>
                        <td className="px-3 py-2">{ex.category}</td>
                        <td className="text-destructive px-3 py-2 text-right tabular-nums">
                          {ex.amount.toLocaleString()} {ex.currency}
                        </td>
                        <td className="text-muted-foreground max-w-[200px] truncate px-3 py-2">
                          {ex.description ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {canAssign ? (
            <OrderExpenseSheet
              orderId={orderId}
              currency={orderQ.data.currency}
              open={expenseSheetOpen}
              onOpenChange={setExpenseSheetOpen}
            />
          ) : null}
        </>
      ) : null}

      {canAssign && (activityQ.data?.data?.length ?? 0) > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            {tOrders("activityHeading")}
          </h2>
          <ul className="space-y-2 text-sm">
            {activityQ.data!.data.map((a) => (
              <li
                key={a.id}
                className="border-border/60 bg-muted/20 rounded-lg border px-3 py-2"
              >
                <span className="font-medium">{a.action}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {a.actor?.fullName ?? "—"} ·{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {canAssign &&
      activityQ.isSuccess &&
      (activityQ.data?.data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-sm">{tOrders("noActivity")}</p>
      ) : null}

      {orderQ.data ? (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{tOrders("tasksHeading")}</h2>
            {orderQ.data.tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : (
              <div className="space-y-2">
                {orderQ.data.tasks.map((task) => (
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
                      <Badge variant="secondary">{task.status}</Badge>
                    </CardHeader>
                    <CardContent className="text-muted-foreground space-y-1 text-sm">
                      <p className="text-xs">
                        {tOrders("priorityLabel")}: {task.priority ?? 0}
                        {task.estimatedHours != null ? (
                          <>
                            {" "}
                            · {tOrders("hoursLabel")}: {task.estimatedHours}
                          </>
                        ) : null}
                      </p>
                      {task.assignee ? (
                        <p>
                          {tTasks("assignee")}:{" "}
                          <span className="text-foreground">
                            {task.assignee.fullName}
                          </span>
                        </p>
                      ) : (
                        <p>{tTasks("assignee")}: —</p>
                      )}
                      {task.description ? (
                        <p className="text-foreground/90">{task.description}</p>
                      ) : null}
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                      >
                        <Link href={`/tasks/${task.id}`}>
                          {tOrders("taskDetailLink")}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {canAssign ? (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">
                {tOrders("assignHeading")}
              </h2>
              <Card>
                <CardContent className="pt-6">
                  <form
                    id={formId}
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setFeedback(null);
                      if (!title.trim()) {
                        return;
                      }
                      if (!assigneeId) {
                        setFeedback("assignee");
                        return;
                      }
                      assignMut.mutate();
                    }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-title`}>
                        {tOrders("taskTitleLabel")}
                      </Label>
                      <Input
                        id={`${formId}-title`}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={tOrders("taskTitlePlaceholder")}
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-desc`}>
                        {tOrders("taskDescriptionLabel")}
                      </Label>
                      <Textarea
                        id={`${formId}-desc`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${formId}-due`}>
                          {tOrders("taskDueLabel")}
                        </Label>
                        <Input
                          id={`${formId}-due`}
                          type="datetime-local"
                          value={dueLocal}
                          onChange={(e) => setDueLocal(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${formId}-worker`}>
                          {tOrders("workerLabel")}
                        </Label>
                        <select
                          id={`${formId}-worker`}
                          className={selectClass}
                          value={assigneeId}
                          onChange={(e) => setAssigneeId(e.target.value)}
                          required
                        >
                          <option value="">
                            {tOrders("workerPlaceholder")}
                          </option>
                          {workersQ.data?.data.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.fullName} ({w.email})
                            </option>
                          ))}
                        </select>
                        {workersQ.isError ? (
                          <p className="text-destructive text-xs">
                            {tCommon("error")}
                          </p>
                        ) : null}
                        {workersQ.data?.data.length === 0 &&
                        !workersQ.isLoading ? (
                          <p className="text-xs text-amber-600 dark:text-amber-500">
                            {tOrders("noWorkers")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`${formId}-prio`}>
                          {tOrders("priorityLabel")}
                        </Label>
                        <Input
                          id={`${formId}-prio`}
                          type="number"
                          min={0}
                          max={100}
                          value={priorityStr}
                          onChange={(e) => setPriorityStr(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${formId}-hrs`}>
                          {tOrders("hoursLabel")}
                        </Label>
                        <Input
                          id={`${formId}-hrs`}
                          type="number"
                          min={0}
                          step="0.25"
                          value={hoursStr}
                          onChange={(e) => setHoursStr(e.target.value)}
                        />
                      </div>
                    </div>
                    {feedback === "success" ? (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {tOrders("assignSuccess")}
                      </p>
                    ) : null}
                    {feedback === "assignee" ? (
                      <p className="text-destructive text-sm">
                        {tOrders("assigneeRequired")}
                      </p>
                    ) : null}
                    {feedback === "fail" ? (
                      <p className="text-destructive text-sm">
                        {tOrders("assignError")}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      disabled={
                        assignMut.isPending ||
                        workersQ.isLoading ||
                        (workersQ.data?.data.length === 0 && !workersQ.isError)
                      }
                    >
                      {assignMut.isPending
                        ? tCommon("loading")
                        : tOrders("submitAssign")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
