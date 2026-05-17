"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { RemoteImageStrip } from "@/components/media/remote-image-thumbnail";
import { ImagePickButton } from "@/components/upload/image-pick-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type { CurrentUser } from "@/lib/auth/session";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { useRealtimeStore } from "@/lib/stores/realtime-store";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  endDate: string | null;
  completedAt: string | null;
  order: { id: string; title: string | null };
};

type ReportRow = {
  id: string;
  message: string;
  photoUrl: string | null;
  imageUrls?: string[];
  createdAt: string;
  task: { id: string; title: string } | null;
};

const EMPTY_TASK_ROWS: TaskRow[] = [];

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const EXTRA_IMAGE_URLS_MAX = 20;

export function WorkerHubClient({ user }: { user: CurrentUser }) {
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const connectForWorker = useRealtimeStore((s) => s.connectForWorker);
  const disconnect = useRealtimeStore((s) => s.disconnect);

  const [reportMsg, setReportMsg] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [extraUrls, setExtraUrls] = useState("");
  const [taskId, setTaskId] = useState("");
  const [reportOk, setReportOk] = useState(false);

  useEffect(() => {
    void connectForWorker(user.id);
    return () => disconnect();
  }, [connectForWorker, disconnect, user.id]);

  useEffect(() => {
    let prevTask = useRealtimeStore.getState().lastTaskChange;
    let prevWs = useRealtimeStore.getState().lastWorkspace;
    return useRealtimeStore.subscribe((state) => {
      if (state.lastTaskChange !== prevTask) {
        prevTask = state.lastTaskChange;
        void qc.invalidateQueries({ queryKey: queryKeys.tasks.hub(user.id) });
        void qc.invalidateQueries({
          queryKey: queryKeys.tasks.list("my", 1, 30),
        });
      }
      if (state.lastWorkspace !== prevWs) {
        prevWs = state.lastWorkspace;
        void qc.invalidateQueries({
          queryKey: queryKeys.dailyReports.list("my", 1, 30),
        });
      }
    });
  }, [qc, user.id]);

  const tasksQ = useQuery({
    queryKey: queryKeys.tasks.hub(user.id),
    queryFn: async () => {
      const res = await proxyFetch("tasks/my?page=1&limit=100");
      if (!res.ok) {
        throw new Error("tasks");
      }
      return (await res.json()) as { data: TaskRow[] };
    },
  });

  const reportsQ = useQuery({
    queryKey: queryKeys.dailyReports.list("my", 1, 30),
    queryFn: async () => {
      const res = await proxyFetch("daily-reports/my?page=1&limit=30");
      if (!res.ok) {
        throw new Error("reports");
      }
      return (await res.json()) as { data: ReportRow[] };
    },
  });

  const tasks = tasksQ.data?.data ?? EMPTY_TASK_ROWS;

  const { today, pending, completed } = useMemo(() => {
    const todayDate = new Date();
    const pendingList = tasks.filter(
      (t) => t.status === "PENDING" || t.status === "WORKING",
    );
    const completedList = tasks.filter((t) => t.status === "DONE");
    const todayList = pendingList.filter((t) => {
      if (!t.endDate) {
        return false;
      }
      const due = new Date(t.endDate);
      return isSameLocalDay(due, todayDate);
    });
    return {
      today: todayList,
      pending: pendingList,
      completed: completedList,
    };
  }, [tasks]);

  const openTasksForSelect = useMemo(
    () => tasks.filter((t) => t.status !== "DONE"),
    [tasks],
  );

  const extraImageLineCount = useMemo(() => {
    return extraUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [extraUrls]);

  const reportMut = useMutation({
    mutationFn: async () => {
      const extras = extraUrls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await proxyFetch("daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: reportMsg.trim(),
          ...(taskId ? { taskId } : {}),
          ...(photoUrl.trim() ? { photoUrl: photoUrl.trim() } : {}),
          ...(extras.length ? { extraImageUrls: extras } : {}),
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
      setExtraUrls("");
      setTaskId("");
      void qc.invalidateQueries({
        queryKey: queryKeys.dailyReports.list("my", 1, 30),
      });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {tTasks("workerHubTitle")}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tTasks("hubReportHeading")}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {tTasks("hubReportHint")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="hub-task">{tTasks("optionalTask")}</Label>
              <select
                id="hub-task"
                className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">{tTasks("noTaskOption")}</option>
                {openTasksForSelect.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-msg">{tTasks("reportMessage")}</Label>
              <Textarea
                id="hub-msg"
                rows={3}
                value={reportMsg}
                onChange={(e) => setReportMsg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-photo">{tTasks("reportPhotoUrl")}</Label>
              <ImagePickButton
                id="hub-photo-upload"
                disabled={reportMut.isPending}
                multiple={false}
                onUploaded={setPhotoUrl}
              />
              <Input
                id="hub-photo"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hub-extra">{tTasks("extraImageUrls")}</Label>
              <ImagePickButton
                id="hub-extra-upload"
                disabled={reportMut.isPending}
                remainingSlots={Math.max(
                  0,
                  EXTRA_IMAGE_URLS_MAX - extraImageLineCount,
                )}
                onUploaded={(url) => {
                  setExtraUrls((prev) => {
                    const existing = prev
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (existing.length >= EXTRA_IMAGE_URLS_MAX) {
                      toast.warning(
                        tCommon("upload.maxLines", {
                          max: EXTRA_IMAGE_URLS_MAX,
                        }),
                      );
                      return prev;
                    }
                    return prev.trim() === "" ? url : `${prev.trim()}\n${url}`;
                  });
                }}
              />
              <Textarea
                id="hub-extra"
                rows={2}
                value={extraUrls}
                onChange={(e) => setExtraUrls(e.target.value)}
              />
            </div>
            <RemoteImageStrip
              urls={[
                ...(photoUrl.trim() ? [photoUrl.trim()] : []),
                ...extraUrls
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              ]}
              altPrefix={tTasks("reportHeading")}
              className="border-border/50 bg-muted/15 rounded-md border border-dashed p-2"
            />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {tTasks("reportsSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {reportsQ.isLoading ? (
              <p className="text-muted-foreground">{tCommon("loading")}</p>
            ) : !reportsQ.data?.data?.length ? (
              <p className="text-muted-foreground">{tCommon("noResults")}</p>
            ) : (
              <ul className="max-h-80 space-y-3 overflow-y-auto">
                {reportsQ.data.data.map((r) => (
                  <li
                    key={r.id}
                    className="border-border/60 rounded-md border p-3"
                  >
                    <p className="text-foreground font-medium">{r.message}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                      {r.task ? ` · ${r.task.title}` : ""}
                    </p>
                    <RemoteImageStrip
                      urls={[
                        ...(r.photoUrl ? [r.photoUrl] : []),
                        ...(r.imageUrls ?? []),
                      ]}
                      altPrefix={tTasks("reportsSection")}
                      className="pt-2"
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {tasksQ.isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>
      ) : tasksQ.isError ? (
        <p className="text-destructive text-sm">{tCommon("error")}</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">{tTasks("todaySection")}</h2>
            {!today.length ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : (
              <div className="space-y-2">
                {today.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">{tTasks("pendingSection")}</h2>
            {!pending.length ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : (
              <div className="space-y-2">
                {pending.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">
              {tTasks("completedSection")}
            </h2>
            {!completed.length ? (
              <p className="text-muted-foreground text-sm">{tTasks("empty")}</p>
            ) : (
              <div className="space-y-2">
                {completed.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: TaskRow }) {
  const tTasks = useTranslations("tasks");
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="text-muted-foreground text-xs">
            {task.endDate
              ? `${tTasks("dueLabel")}: ${new Date(task.endDate).toLocaleDateString()}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{task.status}</Badge>
          <Button asChild variant="outline" size="sm">
            <Link href={`/tasks/${task.id}`}>{tTasks("viewTask")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
