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
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { RemoteImageStrip } from "@/components/media/remote-image-thumbnail";
import { ImagePickButton } from "@/components/upload/image-pick-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/read-api-error-message";

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  workerId: string | null;
  endDate: string | null;
  order: { id: string; title: string | null };
};

type TimelineActivity = {
  kind: "activity";
  id: string;
  type: string;
  createdAt: string;
  actor: { fullName: string } | null;
};

type TimelineComment = {
  kind: "comment";
  id: string;
  body: string;
  createdAt: string;
  author: { fullName: string };
};

type TimelineItem = TimelineActivity | TimelineComment;

export function TaskDetailClient({
  taskId,
  user,
}: {
  taskId: string;
  user: CurrentUser;
}) {
  const tTasks = useTranslations("tasks");
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const router = useRouter();

  const canManageTasks = user.role === "ADMIN" || user.role === "MANAGER";

  const [reportMsg, setReportMsg] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [reportOk, setReportOk] = useState(false);

  const detailQ = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: async () => {
      const res = await proxyFetch(`tasks/${taskId}`);
      if (!res.ok) {
        throw new Error("task");
      }
      return (await res.json()) as TaskDetail;
    },
  });

  const timelineQ = useQuery({
    queryKey: [...queryKeys.tasks.detail(taskId), "timeline"] as const,
    queryFn: async () => {
      const res = await proxyFetch(`tasks/${taskId}/timeline`);
      if (!res.ok) {
        throw new Error("timeline");
      }
      return (await res.json()) as {
        items: TimelineItem[];
      };
    },
    enabled: !!detailQ.data,
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await proxyFetch(`tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === "tasks" || q.queryKey[0] === "orders",
      });
      toast.success(tTasks("toastTaskDeleted"));
      router.push("/tasks");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: async (status: string) => {
      const res = await proxyFetch(`tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error("status");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.tasks.detail(taskId), "timeline"],
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.tasks.list("my", 1, 30),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.tasks.list("all", 1, 30),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.hub(user.id) });
    },
  });

  const reportMut = useMutation({
    mutationFn: async () => {
      const res = await proxyFetch("daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: reportMsg.trim(),
          taskId,
          ...(photoUrl.trim() ? { photoUrl: photoUrl.trim() } : {}),
        }),
      });
      if (!res.ok) {
        throw new Error("report");
      }
      return res.json();
    },
    onSuccess: () => {
      setReportOk(true);
      setReportMsg("");
      setPhotoUrl("");
      void qc.invalidateQueries({
        queryKey: queryKeys.dailyReports.list("my", 1, 20),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.dailyReports.list("my", 1, 30),
      });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.tasks.detail(taskId), "timeline"],
      });
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.hub(user.id) });
    },
  });

  const d = detailQ.data;
  const isAssignee = user.role === "WORKER" && d?.workerId === user.id;
  const canSetStatus = isAssignee && d && d.status !== "DONE";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1 px-0">
        <Link href="/tasks">
          <ArrowLeft className="size-4" aria-hidden />
          {tTasks("title")}
        </Link>
      </Button>
      {detailQ.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : null}
      {detailQ.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : null}
      {d ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-xl">{d.title}</CardTitle>
            <Badge>{d.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {tOrders("title")}:{" "}
              <Link
                href={`/orders/${d.order.id}`}
                className="text-primary font-medium hover:underline"
              >
                {d.order.title ?? d.order.id.slice(0, 8)}
              </Link>
            </p>
            {d.endDate ? (
              <p>
                {tTasks("dueLabel")}:{" "}
                <span className="text-muted-foreground">
                  {new Date(d.endDate).toLocaleString()}
                </span>
              </p>
            ) : null}
            {d.description ? (
              <p className="text-muted-foreground">{d.description}</p>
            ) : null}
            {canSetStatus ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {d.status === "PENDING" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={statusMut.isPending}
                    onClick={() => statusMut.mutate("WORKING")}
                  >
                    {tTasks("startWork")}
                  </Button>
                ) : null}
                {d.status === "WORKING" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={statusMut.isPending}
                    onClick={() => statusMut.mutate("DONE")}
                  >
                    {tTasks("markDone")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {canManageTasks ? (
              <div className="border-border flex flex-wrap gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        tTasks("deleteTaskConfirm", { title: d.title }),
                      )
                    ) {
                      return;
                    }
                    deleteMut.mutate();
                  }}
                >
                  {deleteMut.isPending
                    ? tCommon("loading")
                    : tTasks("deleteTask")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isAssignee && d ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tTasks("reportHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="rep-msg">{tTasks("reportMessage")}</Label>
              <Textarea
                id="rep-msg"
                value={reportMsg}
                onChange={(e) => setReportMsg(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-photo">{tTasks("reportPhotoUrl")}</Label>
              <ImagePickButton
                id="rep-photo-picker"
                disabled={reportMut.isPending}
                multiple={false}
                onUploaded={setPhotoUrl}
              />
              <Input
                id="rep-photo"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
              <RemoteImageStrip
                urls={photoUrl.trim() ? [photoUrl.trim()] : []}
                altPrefix={tTasks("reportPhotoUrl")}
                className="pt-1"
              />
            </div>
            {reportOk ? (
              <p className="text-sm text-emerald-600">
                {tTasks("reportSaved")}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={reportMut.isPending || !reportMsg.trim()}
              onClick={() => {
                setReportOk(false);
                reportMut.mutate();
              }}
            >
              {reportMut.isPending
                ? tCommon("loading")
                : tTasks("submitReport")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {timelineQ.data?.items?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tTasks("timeline")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {timelineQ.data.items.slice(0, 15).map((it) => {
                const when = new Date(it.createdAt).toLocaleString();
                if (it.kind === "activity") {
                  return (
                    <li key={it.id}>
                      <span className="text-foreground">
                        {tTasks("activityLabel")}
                      </span>
                      : {it.type}
                      {it.actor?.fullName
                        ? ` · ${it.actor.fullName}`
                        : ""} · {when}
                    </li>
                  );
                }
                return (
                  <li key={it.id}>
                    <span className="text-foreground">
                      {tTasks("commentLabel")}
                    </span>
                    : {it.body} · {it.author.fullName} · {when}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
