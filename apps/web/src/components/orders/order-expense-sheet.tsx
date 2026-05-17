"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@furniture/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys, proxyFetch } from "@/lib/query-keys";
import { readApiErrorMessage } from "@/lib/read-api-error-message";

export function OrderExpenseSheet({
  orderId,
  currency,
  open,
  onOpenChange,
}: {
  orderId: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const tOrders = useTranslations("orders");
  const tExp = useTranslations("expenses");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();

  /** SSR / birinchi bosqichda `document.body` yoʻq — portal Radix bilan layoutda qotib qolmaydi */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1).max(255),
        amount: z
          .string()
          .trim()
          .min(1, { message: tExp("amountRequired") })
          .transform((raw) =>
            Number.parseFloat(raw.replace(/\s/g, "").replace(",", ".")),
          )
          .refine((n) => Number.isFinite(n) && n > 0, {
            message: tExp("amountInvalid"),
          }),
        category: z.enum(["MATERIAL", "SALARY", "TRANSPORT", "OTHER"]),
        notes: z.string().max(10000).optional(),
      }),
    [tExp],
  );

  const form = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      amount: "",
      category: "MATERIAL",
      notes: "",
    },
  });

  const mut = useMutation({
    mutationFn: async (
      values: z.output<typeof schema>,
    ): Promise<Record<string, unknown>> => {
      const res = await proxyFetch("expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          title: values.title.trim(),
          amount: values.amount,
          category: values.category,
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
          currency,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res));
      }
      return (await res.json()) as Record<string, unknown>;
    },
    onSuccess: () => {
      toast.success(tExp("toastSaved"));
      void qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      void qc.invalidateQueries({
        queryKey: queryKeys.activity.forEntity("order", orderId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.list(1, 25) });
      void qc.invalidateQueries({ queryKey: ["analytics"] });
      void qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "expenses",
      });
      form.reset({
        title: "",
        amount: "",
        category: "MATERIAL",
        notes: "",
      });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.trim().length ? msg : tExp("toastError"));
    },
  });

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  const panel = (
    <>
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="border-border bg-background fixed right-0 top-0 z-[301] flex h-full w-[min(28rem,92vw)] flex-col gap-4 overflow-y-auto border-l p-6 shadow-xl"
      >
        <button
          type="button"
          className="ring-offset-background focus-visible:ring-ring absolute right-4 top-4 rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
          onClick={() => onOpenChange(false)}
          aria-label={tCommon("cancel")}
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="border-border/60 space-y-1 border-b pb-4 pr-8">
          <h2 id={titleId} className="text-lg font-semibold">
            {tOrders("addExpense")}
          </h2>
        </div>
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        >
          <div className="space-y-2">
            <Label htmlFor="ex-title">{tExp("fieldTitle")}</Label>
            <Input id="ex-title" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-destructive text-xs">
                {String(form.formState.errors.title.message ?? "")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-amt">{tExp("fieldAmount")}</Label>
            <Input
              id="ex-amt"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              {...form.register("amount")}
            />
            {form.formState.errors.amount ? (
              <p className="text-destructive text-xs">
                {String(form.formState.errors.amount.message ?? "")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-cat">{tExp("fieldCategory")}</Label>
            <select
              id="ex-cat"
              className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
              {...form.register("category")}
            >
              <option value="MATERIAL">{tExp("catMATERIAL")}</option>
              <option value="SALARY">{tExp("catSALARY")}</option>
              <option value="TRANSPORT">{tExp("catTRANSPORT")}</option>
              <option value="OTHER">{tExp("catOTHER")}</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-notes">{tExp("fieldNotes")}</Label>
            <Textarea id="ex-notes" rows={3} {...form.register("notes")} />
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? tCommon("loading") : tExp("saveExpense")}
            </Button>
            <button
              type="button"
              className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium md:h-10"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
