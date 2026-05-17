"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furniture/ui";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { RemoteImageStrip } from "@/components/media/remote-image-thumbnail";
import { ImagePickButton } from "@/components/upload/image-pick-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { queryKeys, proxyFetch } from "@/lib/query-keys";

export function CreateOrderClient() {
  const router = useRouter();
  const formId = useId();
  const tOrders = useTranslations("orders");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  const REF_IMAGES_MAX = 20;

  const [clientName, setClientName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [prepayment, setPrepayment] = useState("");
  const [refUrls, setRefUrls] = useState("");
  const [msg, setMsg] = useState<"ok" | "err" | "clientEmpty" | null>(null);

  const refLineCount = useMemo(() => {
    return refUrls
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length;
  }, [refUrls]);

  const createMut = useMutation({
    mutationFn: async () => {
      const urls = refUrls
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await proxyFetch("orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(deadline.trim()
            ? { deadline: new Date(deadline).toISOString() }
            : {}),
          ...(totalPrice.trim() ? { totalPrice: Number(totalPrice) } : {}),
          ...(prepayment.trim() ? { prepayment: Number(prepayment) } : {}),
          ...(urls.length
            ? { referenceImages: urls.slice(0, REF_IMAGES_MAX) }
            : {}),
        }),
      });
      if (!res.ok) {
        throw new Error("create");
      }
      return (await res.json()) as { id: string };
    },
    onSuccess: async (data) => {
      setMsg("ok");
      await qc.invalidateQueries({ queryKey: queryKeys.orders.list(1, 25) });
      await qc.invalidateQueries({ queryKey: queryKeys.clients.list(1, 100) });
      router.push(`/orders/${data.id}`);
    },
    onError: () => setMsg("err"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="gap-1 px-0">
        <Link href="/orders">
          <ArrowLeft className="size-4" aria-hidden />
          {tOrders("backToList")}
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tOrders("createTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {tOrders("createSubtitle")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tOrders("createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMsg(null);
              if (!clientName.trim()) {
                setMsg("clientEmpty");
                return;
              }
              createMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`${formId}-client`}>
                {tOrders("clientNameLabel")}
              </Label>
              <Input
                id={`${formId}-client`}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={tOrders("clientNamePlaceholder")}
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-title`}>{tOrders("orderTitle")}</Label>
              <Input
                id={`${formId}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-desc`}>{tOrders("description")}</Label>
              <Textarea
                id={`${formId}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${formId}-deadline`}>
                  {tOrders("deadline")}
                </Label>
                <Input
                  id={`${formId}-deadline`}
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${formId}-total`}>{tOrders("total")}</Label>
                <Input
                  id={`${formId}-total`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-pre`}>{tOrders("prepayment")}</Label>
              <Input
                id={`${formId}-pre`}
                type="number"
                min={0}
                step="0.01"
                value={prepayment}
                onChange={(e) => setPrepayment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ref`}>
                {tOrders("refImagesLabel")}
              </Label>
              <p className="text-muted-foreground text-xs">
                {tOrders("refImagesHint")}
              </p>
              <ImagePickButton
                id={`${formId}-ref-picker`}
                disabled={createMut.isPending}
                remainingSlots={Math.max(0, REF_IMAGES_MAX - refLineCount)}
                onUploaded={(url) => {
                  setRefUrls((prev) => {
                    const existing = prev
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean);
                    if (existing.length >= REF_IMAGES_MAX) {
                      toast.warning(
                        tCommon("upload.maxLines", { max: REF_IMAGES_MAX }),
                      );
                      return prev;
                    }
                    return prev.trim() === "" ? url : `${prev.trim()}\n${url}`;
                  });
                }}
              />
              <Textarea
                id={`${formId}-ref`}
                value={refUrls}
                onChange={(e) => setRefUrls(e.target.value)}
                rows={4}
                placeholder="https://..."
              />
              <RemoteImageStrip
                urls={refUrls.split("\n")}
                altPrefix={tOrders("referencesHeading")}
                className="pt-1"
              />
            </div>
            {msg === "ok" ? (
              <p className="text-sm text-emerald-600">
                {tOrders("createSuccess")}
              </p>
            ) : null}
            {msg === "clientEmpty" ? (
              <p className="text-destructive text-sm">
                {tOrders("clientNameRequired")}
              </p>
            ) : null}
            {msg === "err" ? (
              <p className="text-destructive text-sm">
                {tOrders("createError")}
              </p>
            ) : null}
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending
                ? tCommon("loading")
                : tOrders("createSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
